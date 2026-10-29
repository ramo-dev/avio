# ADR 0001: Encryption Strategy and Licensing

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** Avio maintainers

## Context

Avio is now GPLv3. Users comparing it with Gajim, Conversations, Dino, Monal,
and Converse expect end-to-end encryption, not just transport encryption.

Gajim implements OMEMO via `omemo-dr` and modern OpenPGP via `pysequoia`
(XEP-0374). Converse.js delegates OMEMO to `libomemo.js`. Both the clients and
their crypto engines are copyleft, which is now compatible with Avio's license.

## License findings

| Component | License | Implication for GPLv3 Avio |
|---|---|---|
| Avio | GPL-3.0-only | Source distribution required; no closed-source distribution |
| Gajim / Conversations / Dino | GPLv3 | License-compatible, but their code is Python/Java/Vala and not directly portable to React |
| Monal | BSD-2-Clause | Compatible and permissive, but Swift/Apple-specific |
| Converse.js | MPL-2.0 | Compatible with GPLv3 via its secondary-license terms; useful web reference |
| `omemo-dr` | GPLv3 | License-compatible, but Python-only; not usable from TypeScript |
| `libomemo.js` | GPLv3 | License-compatible and designed for browsers; **not yet formally audited** |
| `libsignal` / `@privacyresearch/libsignal-protocol-typescript` | GPL-3.0 | License-compatible; alternative primitive-level engines |
| `openpgp` | LGPL-3.0+ | Compatible with GPLv3; defer until OMEMO is stable |
| XEP-0384 / XEP-0374 | Specification | Implement or use a compatible library |

License compatibility removes the legal blocker. It does not remove the security
audit requirement. `libomemo.js` explicitly says it has not undergone a formal
third-party audit.

## Decision

1. **Relicense Avio to GPLv3.**
2. **Use `libomemo.js` as the leading OMEMO candidate**, subject to a security
   audit and a storage review. It is crypto-only; Avio still owns the XMPP/PEP,
   stanza, and UI layers.
3. **Do not copy Gajim/Conversations/Dino source.** Use them for behavior and UX
   reference. Monal remains a permissive reference but is not a web stack.
4. **Target OMEMO 1:1 first.** Support the version negotiated per device; start
   with the widest ecosystem compatibility and add OMEMO2 support deliberately.
5. **Do not claim E2EE in the UI until the audit path is complete.** Until then,
   TLS is the only claim.
6. **Defer OpenPGP (XEP-0374)** and OMEMO group/file encryption until 1:1 is
   stable.
7. **No OTR.** It is legacy and adds an unclear security choice.
8. **Keys never go in `localStorage`.** Use a reviewed IndexedDB/keychain boundary
   with a documented threat model, CSP, and worker isolation.

## Consequences

- The application and any Tauri builds must distribute Corresponding Source under
  GPLv3. App-store and proprietary-distribution plans need review.
- `libomemo.js` is GPLv3-compatible but unaudited, so the security work is not
  optional. Budget for an external audit or a funded review.
- Supporting both OMEMO versions increases test and interop work.
- The UI must expose encryption status, device trust, and unencrypted warnings.

## Follow-up

- Security settings surface is in place with honest status indicators.
- Add CSP and the secure key-storage design before OMEMO.
- Run an OMEMO crypto spike in isolation before wiring messages.
- Audit `libomemo.js`; track findings and pin the audited version.
- Revisit this ADR before shipping E2EE.
