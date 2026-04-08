import logging

from databricks.vector_search.client import VectorSearchClient
from langchain_openai import OpenAIEmbeddings
from langchain_core.runnables import RunnableLambda

from config import (
    DATABRICKS_TOKEN,
    DATABRICKS_BASE_URL,
    VS_WORKSPACE_URL,
    VS_TOKEN,
    VS_ENDPOINT,
    VS_INDEX,
    RAG_TOP_K,
)

logger = logging.getLogger(__name__)

query_embeddings = OpenAIEmbeddings(
    model="databricks-bge-large-en",
    api_key=DATABRICKS_TOKEN,
    base_url=DATABRICKS_BASE_URL,
    check_embedding_ctx_length=False,
)

vsc = None
if VS_WORKSPACE_URL:
    try:
        vsc = VectorSearchClient(
            workspace_url=VS_WORKSPACE_URL,
            personal_access_token=VS_TOKEN,
            disable_notice=True,
        )
    except Exception as _e:
        logger.warning("Vector Search client init failed: %s — RAG disabled", _e)
else:
    logger.warning("VS_WORKSPACE_URL not set — RAG retrieval disabled")


def retrieve_context(query: str, top_k: int = RAG_TOP_K) -> str:
    """Embed *query* via the AI Gateway, then search the Databricks vector index."""
    if vsc is None:
        return ""
    try:
        vec = query_embeddings.embed_query(query)
        idx = vsc.get_index(endpoint_name=VS_ENDPOINT, index_name=VS_INDEX)
        results = idx.similarity_search(
            query_vector=vec,
            columns=["content", "source_file", "chunk_index"],
            num_results=top_k,
        )
        rows = results.get("result", {}).get("data_array", [])
        if not rows:
            print(f"\n[RAG] Query: {query!r}")
            print("[RAG] No results found.\n")
            return ""
        print(f"\n[RAG] Query: {query!r}")
        print(f"[RAG] Retrieved {len(rows)} chunks:")
        parts = []
        for i, row in enumerate(rows, 1):
            content, src, cidx = row[0], row[1], row[2]
            preview = content[:150].replace("\n", " ")
            print(f"  [{i}] {src} (chunk {cidx}) — {preview}...")
            parts.append(f"[Source: {src}, Chunk {cidx}]\n{content}")
        print()
        return "\n\n---\n\n".join(parts)
    except Exception:
        logger.exception("RAG retrieval failed — companion will respond without context")
        return ""


retrieve_runnable = RunnableLambda(lambda inputs: retrieve_context(inputs["input"]))
