from dataclasses import dataclass, field


@dataclass
class ParsedDocument:
    sections: list["ParsedDocumentSection"]


@dataclass
class ParsedDocumentSection:
    kind: str
    label: str
    text: str
    metadata: dict[str, object] = field(default_factory=dict)
