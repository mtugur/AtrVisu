# AtrVisu Master Plan Source Fingerprint

Status: Normative source-identity record

Reviewed source file: `AtrVisu_Master_Plan_v3_0.docx`
Reviewed source title: `AtrVisu Master Plan v3.0 - Endüstriyel Mühendislik Platformu`
Review date: 2026-09-17
SHA-256 of reviewed DOCX bytes: `0ff97ed5c07213b1a875cd3ebdd498cc739c0f07eb35c48b9777cacf9bd58da7`

## Purpose
The Project resource and repository contracts live in different systems. This fingerprint makes the exact Master Plan instance used for the 2026-09-17 governance projection identifiable.

## Rule
If a future Master Plan file has a different SHA-256, do not assume it is equivalent because the filename or visible version number is unchanged. Review the changed source, update `MASTER_PLAN_PROJECTION.md`, update this fingerprint, and project every durable changed decision into repository contracts before implementation continues.

If the source file is intentionally regenerated without semantic changes, record that fact and re-establish the fingerprint after confirming semantic equivalence.

Repository CI cannot fetch the ChatGPT Project resource by itself. This fingerprint therefore supports deterministic human/agent source comparison; it does not claim autonomous external-source drift detection.