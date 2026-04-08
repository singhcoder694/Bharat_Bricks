from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory

from app.config import (
    DATABRICKS_TOKEN,
    DATABRICKS_BASE_URL,
    COMPANION_LLM_MODEL,
    COMPANION_GUARDRAILS_PATH,
)

with open(COMPANION_GUARDRAILS_PATH, "r", encoding="utf-8") as f:
    companion_guardrails_text = f.read()

companion_llm = ChatOpenAI(
    model=COMPANION_LLM_MODEL,
    api_key=DATABRICKS_TOKEN,
    base_url=DATABRICKS_BASE_URL,
)


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

chain_inner = companion_prompt | companion_llm
chain_with_hint = RunnablePassthrough.assign(language_hint=_language_hint_block) | chain_inner

session_store: dict[str, ChatMessageHistory] = {}


def get_session_history(session_id: str) -> ChatMessageHistory:
    if session_id not in session_store:
        session_store[session_id] = ChatMessageHistory()
    return session_store[session_id]


companion_chain = RunnableWithMessageHistory(
    chain_with_hint,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history",
)
