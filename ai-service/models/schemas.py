"""Pydantic schemas for the AI service"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class Gender(str, Enum):
    MALE        = "MALE"
    FEMALE      = "FEMALE"
    UNSPECIFIED = "UNSPECIFIED"


class PrivacyLevel(str, Enum):
    PUBLIC    = "PUBLIC"
    COMMUNITY = "COMMUNITY"
    FAMILY    = "FAMILY"
    PRIVATE   = "PRIVATE"


class MemberInput(BaseModel):
    id:             Optional[str]  = None
    fullName:       str
    fullNameArabic: Optional[str]  = None
    fatherName:     Optional[str]  = None
    grandfatherName: Optional[str] = None
    gender:         Optional[Gender] = Gender.UNSPECIFIED
    birthYear:      Optional[int]  = None
    deathYear:      Optional[int]  = None
    tribe:          Optional[str]  = None
    clan:           Optional[str]  = None
    region:         Optional[str]  = None
    isAlive:        bool           = True
    lineage:        Optional[str]  = None


class DuplicateRequest(BaseModel):
    members: List[MemberInput]
    threshold: float = Field(default=0.75, ge=0.0, le=1.0)


class DuplicateResult(BaseModel):
    member1Id: str
    member2Id: str
    score:     float
    reasons:   List[str]


class DuplicateResponse(BaseModel):
    duplicates: List[DuplicateResult]
    analyzed:   int
    processing_time_ms: float


class RelationshipValidationRequest(BaseModel):
    person1:          MemberInput
    person2:          MemberInput
    relationshipType: str


class ValidationResponse(BaseModel):
    isValid:    bool
    warnings:   List[str]
    confidence: float
    explanation: Optional[str] = None


class SuggestionRequest(BaseModel):
    member:      MemberInput
    treeContext: List[MemberInput]


class SuggestionItem(BaseModel):
    type:        str
    personId:    Optional[str] = None
    description: str
    confidence:  float
    reasoning:   str


class SuggestionResponse(BaseModel):
    suggestions: List[SuggestionItem]


class LineageRequest(BaseModel):
    treeId:  str
    members: List[MemberInput]


class LineagePattern(BaseModel):
    type:        str
    description: str
    confidence:  float
    members:     List[str] = []


class MigrationPoint(BaseModel):
    region:     str
    period:     str
    population: int


class LineageResponse(BaseModel):
    patterns:          List[LineagePattern]
    migrationRoute:    List[MigrationPoint]
    tribeDistribution: Dict[str, int]
    generationDepth:   int
    avgGenerationGap:  Optional[float] = None


class TribeInferenceRequest(BaseModel):
    fullName:   str
    fatherName: Optional[str] = None
    region:     Optional[str] = None
    lineage:    Optional[str] = None


class TribeInferenceResponse(BaseModel):
    tribe:        str
    confidence:   float
    alternatives: List[str]
    reasoning:    str


class NarrativeRequest(BaseModel):
    treeId:   str
    language: str = "ar"
    members:  Optional[List[MemberInput]] = None


class NarrativeResponse(BaseModel):
    narrative:  str
    highlights: List[str]
    summary:    Optional[str] = None


class HeritageReportRequest(BaseModel):
    treeId:   str
    language: str = "ar"


class HeritageReportResponse(BaseModel):
    report:   str
    sections: Dict[str, str]
