from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
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

companion_prompt = ChatPromptTemplate.from_messages([
    ("system", companion_guardrails_text),
    MessagesPlaceholder("history"),
    ("human", "{input}"),
])

chain = companion_prompt | companion_llm

session_store: dict[str, ChatMessageHistory] = {}


def get_session_history(session_id: str) -> ChatMessageHistory:
    if session_id not in session_store:
        session_store[session_id] = ChatMessageHistory()
    return session_store[session_id]


companion_chain = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history",
)
