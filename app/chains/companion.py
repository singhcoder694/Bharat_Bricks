from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnableLambda
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.messages import ToolMessage
from langchain_community.chat_message_histories import ChatMessageHistory

from config import (
    DATABRICKS_TOKEN,
    DATABRICKS_BASE_URL,
    COMPANION_LLM_MODEL,
    COMPANION_GUARDRAILS_PATH,
)
from utils.retriever import query_knowledgebase

with open(COMPANION_GUARDRAILS_PATH, "r", encoding="utf-8") as f:
    companion_guardrails_text = f.read()

companion_llm = ChatOpenAI(
    model=COMPANION_LLM_MODEL,
    api_key=DATABRICKS_TOKEN,
    base_url=DATABRICKS_BASE_URL,
)

companion_llm_with_tools = companion_llm.bind_tools([query_knowledgebase])


def _language_hint_block(inputs: dict) -> str:
    code = inputs.get("language_code")
    if code and str(code).strip().lower() not in ("", "unknown", "none"):
        return (
            f"Speech/language hint from the client: {code}. "
            "Reply in the same language as the user's message when it is an Indian language, English, or code-mixed text."
        )
    return (
        "Match the language of the user's latest message: Indian languages, English, or natural code-mixing."
    )


companion_prompt = ChatPromptTemplate.from_messages([
    ("system", companion_guardrails_text),
    ("system", "{language_hint}"),
    MessagesPlaceholder("history"),
    ("human", "{input}"),
])


def _run_agent(inputs: dict):
    """Simple agent loop: LLM decides whether to call query_knowledgebase."""
    inputs["language_hint"] = _language_hint_block(inputs)
    messages = companion_prompt.invoke(inputs).to_messages()

    response = companion_llm_with_tools.invoke(messages)

    if not response.tool_calls:
        return response

    messages.append(response)
    for tc in response.tool_calls:
        print(f"[AGENT] Tool call: {tc['name']}(query={tc['args'].get('query', '')!r})")
        result = query_knowledgebase.invoke(tc["args"])
        messages.append(ToolMessage(content=result, tool_call_id=tc["id"]))

    final = companion_llm_with_tools.invoke(messages)
    return final


chain_with_rag = RunnableLambda(_run_agent)

HISTORY_WINDOW = 5

session_store: dict[str, ChatMessageHistory] = {}


def get_session_history(session_id: str) -> ChatMessageHistory:
    if session_id not in session_store:
        session_store[session_id] = ChatMessageHistory()
    history = session_store[session_id]
    if len(history.messages) > HISTORY_WINDOW * 2:
        history.messages = history.messages[-(HISTORY_WINDOW * 2):]
    return history


companion_chain = RunnableWithMessageHistory(
    chain_with_rag,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history",
)
