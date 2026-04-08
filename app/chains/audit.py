import os

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import DATABRICKS_TOKEN, DATABRICKS_BASE_URL, AUDIT_LLM_MODEL, GUARDRAILS_PATH
from schemas import AuditResult, ChunkAuditResult

with open(GUARDRAILS_PATH, "r", encoding="utf-8") as f:
    guardrails_text = f.read()

audit_llm = ChatOpenAI(
    model=AUDIT_LLM_MODEL,
    api_key=DATABRICKS_TOKEN,
    base_url=DATABRICKS_BASE_URL,
)

structured_llm = audit_llm.with_structured_output(ChunkAuditResult, method="json_mode")

audit_prompt = ChatPromptTemplate.from_messages([
    ("system", "{guardrails}\n\nReturn JSON with keys: is_relevant (bool), relevance_score (float 0-1), relevant_text (verbatim extracted text or empty string)."),
    ("human", "Audit this chunk and return your response as json.\n\nFilename: {filename}\n\nContent:\n{content}"),
])

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=20_000,
    chunk_overlap=0,
    separators=["\n\n", "\n", ". ", " ", ""],
)

# LCEL chain: prompt -> structured LLM (schema-enforced output)
chunk_audit_chain = audit_prompt | structured_llm


def process_file(file_path: str) -> AuditResult:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    filename = os.path.basename(file_path)

    chunks = text_splitter.split_text(content)
    print(f"    Split into {len(chunks)} chunks")

    chunk_inputs = [
        {
            "filename": f"{filename} [chunk {i + 1}/{len(chunks)}]",
            "content": chunk,
            "guardrails": guardrails_text,
        }
        for i, chunk in enumerate(chunks)
    ]

    chunk_results: list[ChunkAuditResult] = chunk_audit_chain.batch(chunk_inputs)

    relevant_texts = []
    scores = []

    for i, result in enumerate(chunk_results):
        scores.append(result.relevance_score)
        if result.is_relevant and result.relevant_text.strip():
            relevant_texts.append(f"--- Chunk {i + 1} ---\n{result.relevant_text}")

    if os.path.exists(file_path):
        os.remove(file_path)

    return AuditResult(
        filename=filename,
        is_relevant=len(relevant_texts) > 0,
        relevance_score=round(sum(scores) / len(scores), 2) if scores else 0.0,
        relevant_text="\n\n".join(relevant_texts),
    )


file_chain = RunnableLambda(process_file)
