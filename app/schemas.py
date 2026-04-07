from pydantic import BaseModel, Field


class ChunkAuditResult(BaseModel):
    is_relevant: bool = Field(description="Whether the chunk contains relevant content")
    relevance_score: float = Field(description="Relevance score from 0.0 to 1.0")
    relevant_text: str = Field(description="Verbatim extracted relevant text, or empty string if irrelevant")


class AuditResult(BaseModel):
    filename: str = Field(description="Name of the audited file")
    is_relevant: bool = Field(description="Whether the document contains relevant content")
    relevance_score: float = Field(description="Relevance score from 0.0 to 1.0")
    relevant_text: str = Field(description="Concatenated verbatim relevant text from all chunks")
