# 📌 Decentralized Anonymous Campus Rumor Verification System

## 📄 Full Proposal – Day 1 Submission

---

# 1️⃣ Problem Understanding

The goal is to build a decentralized system where students can anonymously submit and verify rumors or news related to campus events.
The system must operate **without any central authority controlling truth**, while ensuring fairness, trust, and resistance to manipulation.

Key challenges include:

* No central server or admin controlling truth
* Users must remain anonymous
* Same person cannot vote multiple times
* Bots must not manipulate system
* Popular false rumors must not win
* Past verified rumors must not change
* Deleted rumors must not affect new rumors
* System must resist coordinated groups of liars
* Trust must be built through a mechanism we design

The solution must be secure, decentralized, anonymous, and mathematically defensible.

---

# 2️⃣ Assumptions

* Only university students can participate
* Each student has a valid university email
* Users want anonymity but fairness
* System should be self-governed
* No central authority should control truth
* Users can verify rumors with or without evidence

---

# 3️⃣ Proposed Solution Overview

We propose a **Decentralized Anonymous Rumor Trust System** that uses:

* Peer-to-peer (P2P) architecture
* Anonymous cryptographic user identity
* OTP-based email eligibility verification
* PBKDF2-based zero-knowledge user ID generation and key encryption kye (KEK) and Data Encryption Key (DEK) generation
* Weighted reputation-based voting
* Evidence-based trust scoring
* Immutable rumor finalization
* Time-decay for rumor relevance

This system ensures fairness, anonymity, bot resistance, and long-term reliability.

---

# 4️⃣ System Architecture

## 🔹 Decentralized P2P Design

The system follows a **peer-to-peer architecture** instead of a central server.

* No single admin controls rumor truth
* Data distributed across nodes
* Each node validates votes and rumors
* Final trust scores computed collectively

This ensures transparency and prevents centralized manipulation.

---

# 5️⃣ Anonymous User Identity System

## 🔹 Step 1: University Email OTP Verification

To ensure only real students join:

* User enters university email
* OTP sent to email
* Email verified once

This ensures:

* Only real students can join
* Bots without email cannot join

After verification:

* Email is NEVER stored permanently
* Identity remains anonymous

---

## 🔹 Step 2: Anonymous User ID Generation (Zero Knowledge)

After OTP verification:

user_email + user_password → PBKDF2 → Anonymous User ID 


* PBKDF2 generates secure hash
* No raw email stored
* No identity stored
* System cannot reverse identity

This anonymous ID becomes:

* User identity in system
* Used only for voting & reputation
* Zero knowledge for system

---

# 6️⃣ Encryption & Security Model (KEK + DEK)

### Key Encryption Key (KEK)

Generated using PBKDF2 from:

#email + password

### Data Encryption Key (DEK)

* Used to encrypt user data
* DEK encrypted by KEK
* Stored securely

### Runtime Security

* Keys generated locally
* Keys removed when app closes
* No permanent plaintext storage

This ensures:

* End-to-end encryption
* Zero-knowledge system
* Maximum privacy
* Also HTTPS TSL encryption will also be used
---

# 7️⃣ One Person = One Vote System

Each anonymous user ID can:

* Vote once per rumor
* Cannot vote multiple times
* Duplicate votes can't be done

Vote mapping:

#anonymous_user_id + rumor_id → unique vote record

Ensures fairness without revealing identity.

---

# 8️⃣ Bot Prevention Mechanism

Bots cannot manipulate system because:

* University email OTP required
* PBKDF2 identity required
* Each account tied to real student email
* New accounts start with very low weight

Therefore:

* Automated bots blocked
* Fake mass voting ineffective

---

# 9️⃣ Reputation-Based Weighted Voting System (Detailed Maths s the end of the doc)

Each user has a **reputation weight**.

Initial weight:

#New user = low weight

After rumor finalization:

* Correct vote → weight increases
* Wrong vote → weight decreases

### Vote impact:

# Vote Impact = user_weight × vote_value

Where:

* True vote = +1
* False vote = −1

### Trust Score Formula:

# Trust Score =
Σ(weighted true votes)
− Σ(weighted false votes)

** evidence score**
Methematical explanation given at the end of the document 

Benefits:

* Honest users gain influence
* Dishonest users lose influence
* Bots/new accounts have low power
* Popular false rumors cannot win easily

---

# 🔟 Evidence-Based Trust Enhancement

Rumors with strong evidence gain extra trust:

| Evidence Type  | Score  |
| -------------- | ------ |
| Text only      | Low    |
| Image proof    | Medium |
| Document proof | High   |

This ensures:

* Evidence-supported rumors stronger
* Fake rumors weaker

---

# 1️⃣1️⃣ Rumor Lifecycle & Finalization

## Active Phase

* Users post rumors
* Others vote & verify
* Trust score changes dynamically

## Finalization Phase

When:

* Engagement very low
* Voting stabilized
* After a fixed time , started form votaing stability  passed the roumer will be proceded to the result finalization process

Then rumor becomes:

## FINALIZED (TRUE / FALSE)


After finalization:

* Score becomes immutable
* No further changes allowed
* Historical truth preserved

This prevents:

> Verified facts from changing later

## Decay Phase

As time passes:

* Impressions decrease
* Engagement decreases
* Popularity decays
---

# 1️⃣2️⃣ Deleted Rumor Handling

Rumors are never hard deleted.

Instead:

status = ACTIVE
status = FINAL
status = DELETED


Deleted rumors:

* Removed from feed
* Excluded from trust calculations
* Cannot affect new rumors

This fixes:

> Deleted rumors affecting new rumor scores

---

# 1️⃣3️⃣ Time Decay (Half-Life Model)

To keep system fresh:

* Older rumors gradually lose visibility
* New rumors gain priority

Example:

* 3-year-old rumor → low visibility
* Recent rumor → high visibility

Decay affects:

* Feed ranking
* Impression priority

But NOT final truth.

---

# 1️⃣4️⃣ Mathematical Resistance to Manipulation

The system is resistant to coordinated liars because:

1. Each user has only one vote
2. New users start with low reputation
3. Influence grows only through history of user
4. Wrong voting reduces weight
5. Evidence strengthens truth score

Therefore:

> A coordinated group of dishonest users cannot significantly manipulate the system without first consistently voting correctly over time. Incorrect predictions reduce their reputation and influence, making large-scale manipulation mathematically difficult and self-correcting.

---

# 1️⃣5️⃣ Advantages of Proposed System

### 🔐 Privacy

* No identity stored
* Anonymous participation
* Zero-knowledge architecture

### 🛡 Security

* Encrypted data
* PBKDF2-based identity
* Bot-resistant

### ⚖ Fairness

* Weighted voting
* Reputation system
* Evidence-based trust

### 🔄 Stability

* Immutable finalized rumors
* No past score changes
* Deleted rumors isolated

### 🌐 Decentralization

* No central authority
* Community-driven truth
* Trust built collectively

---


# Decentralized Rumor Verification System (Mathemematical Proof)

## 1. Goal

Build a decentralized system where students post rumors, vote
true/false, attach evidence, and truth emerges mathematically without
any admin.

Truth gains influence. Lies lose influence.

------------------------------------------------------------------------

## 2. Entities

Users: U = {u1, u2, ..., un}

Each user has reputation: wi \> 0

Posts (Rumors): R = {r1, r2, ..., rm}

------------------------------------------------------------------------

## 3. User Actions

### Vote on Post

vi ∈ {+1, -1}

+1 → True\
-1 → False

### Upload Evidence

Evidence types have base multipliers:

Text = 0.4\
Image = 0.7\
Video = 1.0\
Document = 1.2

user seeing the evidance can vote it for its scoring
### Score Evidence

sij ∈ \[0,1\]

------------------------------------------------------------------------

## 4. Evidence Strength

ei = bi \* ( Σ(wj \* sij) / Σ(wj) )

------------------------------------------------------------------------

## 5. Correlation Penalty (Anti-bot)

ci = 1 / Ci

------------------------------------------------------------------------

## 6. Effective Weight

Wi = wi \* ei \* ci

------------------------------------------------------------------------

## 7. Trust Score

T(r) = Σ(Wi \* vi) / Σ(Wi)

Range: \[-1, +1\]

------------------------------------------------------------------------

## 8. Post State

True if T(r) ≥ 0.6\
False if T(r) ≤ -0.6\
Disputed otherwise

------------------------------------------------------------------------

## 9. Final Outcome

O(r) ∈ {+1, -1}

------------------------------------------------------------------------

## 10. Reputation Update

wi(new) = wi(old) \* exp(α \* vi \* O(r))

α ≈ 0.1

------------------------------------------------------------------------

## 11. Half-Life Decay

wi = wi \* 2\^(-t / h)

h = half-life (e.g., 30 days)

------------------------------------------------------------------------

## 12. Posting History Penalty

P(n) = 100 - (n-1)\^2 %

pi = P(n) / 100

wi = wi \* pi

------------------------------------------------------------------------

## 13. Mass False Reporting

Attack succeeds only if:

ΣWattackers \> ΣWhonest

Made impractical by low reputation, correlation penalty, and decay.

------------------------------------------------------------------------

## 14. Byzantine Fault Tolerance

System correct if:

H \> 2B

Nodes run PBFT/Tendermint.

------------------------------------------------------------------------

## 15. Workflow

1.  User posts rumor
2.  Users vote
3.  Users attach evidence
4.  Evidence scored
5.  Compute T(r)
6.  Show state
7.  Determine O(r)
8.  Update reputation
9.  Apply decay

------------------------------------------------------------------------

## 16. System Invariant

Influence ∝ Historical Accuracy

------------------------------------------------------------------------
# 🏁 Conclusion

This proposed decentralized anonymous rumor verification system ensures:

* Complete user anonymity
* No central authority control
* Strong bot and manipulation resistance
* Fair trust scoring mechanism
* Immutable historical truth
* Self-correcting reputation system

By combining cryptographic identity, weighted voting, decentralized architecture, and trust scoring, the system creates a secure and fair ecosystem where truth emerges collectively from the community rather than from any central authority.
This system is a self-correcting decentralized truth engine based purely
on mathematics.
