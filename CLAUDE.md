@AGENTS.md

# Cahier des charges

`CAHIER_DES_CHARGES.md` is the living spec for this project. Whenever the
user requests a scope or feature change (new requirement, modified
requirement, format/behavior change, etc.), update that file's "Journal des
modifications demandées" table and the relevant section — every time, not
just when asked to.

# Validation logicielle (VSI)

`VALIDATION.md` is the living software validation record for this project.
Whenever a feature or fix ships (new or changed), add/update its row(s) —
both the nominal "cas passant" and at least one "cas bloquant" actually
exercised (validation error, guard, permission check, missing-config
degradation...) with the real result observed, not an assumed one. Every
time, not just when asked to.
