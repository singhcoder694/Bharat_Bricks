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


class ChatRequest(BaseModel):
    session_id: str = Field(description="Unique session identifier for conversation continuity")
    message: str = Field(description="User's message")
    language_code: str | None = Field(
        default=None,
        description="Optional BCP-47 code from speech (e.g. hi-IN) for reply language",
    )


class ChatResponse(BaseModel):
    session_id: str
    response: str = Field(description="Companion agent's response")


class TranscribeResponse(BaseModel):
    text: str = Field(description="Transcribed speech")
    language: str | None = Field(default=None, description="Detected BCP-47 language code")
    language_probability: float | None = Field(default=None, description="Unused for Sarvam; reserved for API stability")


class TtsSegment(BaseModel):
    mime: str = Field(default="audio/mpeg", description="Audio MIME type")
    data: str = Field(description="Base64-encoded audio bytes")


class TtsRequest(BaseModel):
    text: str = Field(description="Text to speak (long messages are split server-side)")
    target_language_code: str = Field(
        default="en-IN",
        description="Sarvam BCP-47 code, e.g. hi-IN, ta-IN, en-IN",
    )


class TtsResponse(BaseModel):
    segments: list[TtsSegment] = Field(description="Ordered MP3 segments for sequential playback")
