---
name: Pass the Aux
type: project-design
version: 0.1.0
status: concept
workflow: Development State Machine Workflow
workflow_version: 1.6.0
---

# Pass the Aux — Initial Design

**Working tagline:** Your music. Your deck. Your rules.

## 1. Project Overview

### 1.1 Core concept

Pass the Aux is a music collection and playlist-building application with an optional social music game built around the same underlying system.

The central idea is that **songs are represented as cards**.

A song card is a visual representation of a song and its information: title, artist, artwork, genre, tags, BPM, energy, mood, and other useful attributes.

Users can organize these song cards into **decks**, which function as playlists. Decks can be personal collections, themed playlists, collaborative collections, or sources for a group session.

The card-game aspect is a natural extension of this system rather than the application's primary purpose.

The same song library and decks should support three broad experiences:

1. **Collect and organize:** Browse music, build a personal library, and create playlists/decks.
2. **Listen together:** Take turns adding songs to a shared listening session.
3. **Play the game:** Add optional rules, compatibility evaluations, challenges, and scoring to the same song-selection experience.

The application should not force users to play a game to use its music features.

### 1.2 Design principle

**One music collection, multiple ways to interact with it.**

A song should not need to be recreated for every playlist or game. It should have one underlying identity in the user's collection and be referenced by any number of decks and sessions.

The card is a way to browse and interact with a song, not a separate copy of the song.

### 1.3 Product identity

The aesthetic should draw from underground music culture, DIY music scenes, punk flyers, physical card games, record collections, and music magazines.

It should feel like a place to collect and share music rather than a conventional streaming service.

The visual identity should support:
- Music discovery and personal taste.
- Collecting and organizing songs.
- Sharing music with friends.
- Customizable decks and song cards.
- An optional competitive or cooperative game experience.

The name **Pass the Aux** is provisional because existing applications already use it.

---

## 2. Product Structure

The product is organized around four related concepts.

### 2.1 Song library

The library is the user's collection of song records.

Users can:
- Search for songs.
- Add songs to their collection.
- Browse and filter their collection.
- Sort by title, artist, genre, BPM, energy, date added, and other attributes.
- Open a song's details.
- Add songs to one or more decks.
- Edit personal tags and notes.
- Identify duplicates or alternate versions.

The library should be useful even when a song does not have a playable link from a supported music provider.

### 2.2 Song cards

Every song in the library has a corresponding card representation.

The card should communicate the most useful information without overwhelming the user.

Potential card information:
- Album artwork or another representative image.
- Song title.
- Artist.
- Genre and subgenre.
- BPM.
- Energy.
- Mood.
- Tags.
- Duration.
- Optional user rating or notes.

Cards can have a compact presentation for browsing and a more detailed presentation when opened.

The card design should be customizable over time, but the initial implementation should prioritize readability and consistent information.

### 2.3 Decks

A deck is a reusable collection of songs. In ordinary use, a deck is effectively a playlist.

Users can:
- Create a deck.
- Add and remove songs.
- Reorder songs.
- Rename and describe a deck.
- Browse a deck in list or card view.
- Duplicate a deck.
- Share a deck.
- Export a deck to an external music service where supported.

A song can belong to multiple decks without being duplicated in the library.

Examples:
- Punk Favorites
- Late Night
- Road Trip
- Songs to Share
- Experimental
- Gym Playlist
- Game Night

Decks should not inherently require a game mode.

### 2.4 Sessions

A session is a temporary or ongoing shared activity involving multiple participants.

A session can use an existing deck, a selection of decks, or an initially empty collection.

A session has its own:
- Participants.
- Turn order.
- Song queue.
- Current song.
- Playback state.
- Session history.
- Optional game rules and scores.

A session is distinct from a deck:

- **Deck:** A reusable collection of songs.
- **Session:** A particular shared activity using songs from one or more sources.

This distinction allows a deck to exist independently while multiple sessions can use it.

---

## 3. Browsing and User Interface

### 3.1 Conventional browsing with card view

The primary browsing experience should feel familiar to users of digital game libraries such as Steam.

Users should be able to browse their music conventionally, with a choice between:

- **List view:** A compact, practical view for searching, sorting, comparing, and managing many songs.
- **Card view:** A visual grid of song cards, similar to browsing a collection of games or a physical card collection.

The two views must represent the same underlying collection. Switching views should not change the collection, selection, ordering, or organization.

The user should not have to choose between a functional music library and the distinctive card-based presentation.

### 3.2 Library navigation

Possible navigation structure:

- Library
- Decks
- Sessions
- Shared with me
- Favorites
- Recently added

The exact navigation layout remains open to refinement.

### 3.3 Song card interactions

A song card should support:
- Selecting a song.
- Opening song details.
- Adding the song to a deck.
- Adding the song to a session.
- Playing or opening the song through a supported provider.
- Viewing its tags and attributes.

Card interactions should remain consistent between the library, deck, and session views.

### 3.4 Visual direction

Potential visual references:
- Steam's library grid and list browsing.
- Collectible card games and their card presentation.
- Underground music magazines and photocopied zines.
- DIY gig flyers, stickers, patches, and handwritten setlists.
- Record sleeves, cassette labels, and physical mixtapes.

Avoid making the application look like a generic streaming-service clone.

The aesthetic should be expressive, but the actual music-management experience should remain clear and easy to use.

---

## 4. Application Modes

### 4.1 Collection mode

The ordinary music-management experience.

Users browse their library, create decks, organize songs, and prepare playlists.

No multiplayer or game rules are required.

### 4.2 Listening mode

A group creates or joins a session and takes turns adding songs.

Example:

1. A host creates a session.
2. Participants join.
3. The session establishes a turn order.
4. The current participant chooses a song.
5. The song is added to the shared queue.
6. The turn passes to the next participant.
7. The group listens to the resulting playlist.

The session can begin with an empty queue or use an existing deck as its starting point.

Listening mode should not require points, judging, or competition.

The main objective is to create a shared playlist through everyone's contributions.

### 4.3 Game mode

Game mode adds optional rules to the same song-selection system.

The music remains the central content. The game evaluates or responds to the songs people choose.

Potential mechanics:
- Song compatibility.
- Playlist cohesion.
- Transition quality.
- Genre or mood challenges.
- Creative contrasts.
- Player voting.
- Points and achievements.

The game should be modular enough that different rulesets can be introduced without changing the underlying song library or deck system.

### 4.4 Hybrid mode

A hybrid session combines ordinary listening with optional game mechanics.

Players take turns adding songs, the playlist grows, and the game evaluates choices or awards points.

The result should still be a usable playlist after the session ends.

This is important: the game should create something people actually want to listen to afterward.

---

## 5. Song Attributes and Game Mechanics

### 5.1 Song metadata

Potential attributes include:

| Attribute | Purpose |
|---|---|
| Title | Identify the song |
| Artist | Identify the performer |
| Album | Album association |
| Genre | Broad musical category |
| Subgenre | More specific classification |
| Tags | Flexible descriptions |
| BPM | Tempo information |
| Energy | Perceived intensity |
| Mood | Emotional or atmospheric quality |
| Duration | Track length |
| Artwork | Visual identification |
| Provider links | External playback and matching |

Some attributes may be imported from external metadata sources, while others may be user-defined.

Metadata should retain its source and confidence where appropriate. For example, an automatically estimated BPM should not be presented as unquestionably accurate.

### 5.2 Compatibility

Compatibility should not be reduced to matching BPM or genre.

Potential compatibility dimensions:

**Vibe compatibility**
- Mood.
- Genre.
- Energy.
- Instrumentation.
- Atmosphere.

**Transition compatibility**
- BPM relationship.
- Energy changes.
- Musical contrast.
- Genre transitions.
- Overall listening flow.

**Creative compatibility**
- Unexpected combinations.
- Interesting contrasts.
- Unusual transitions.
- Bringing an earlier musical direction back into the playlist.

A large BPM difference should not automatically count as a bad transition. A surprising transition can be more interesting than two nearly identical songs.

### 5.3 Possible scoring categories

These are exploratory labels, not finalized rules:

- **FLOW:** A transition that works especially well.
- **STYLE:** A song that fits the current direction.
- **CURVEBALL:** An unexpected but interesting choice.
- **DEEP CUT:** An interesting or less obvious discovery.
- **SAVE:** A choice that brings the playlist together.
- **CHAOS:** A song that deliberately changes the direction.

Scoring should distinguish between:
- Automated estimates.
- Player opinions.
- Actual game outcomes.

Automated compatibility should be treated as a suggestion or input to a ruleset, not an unquestionable judgment of musical quality.

---

## 6. Data Model

The initial conceptual model should separate song identity, collection membership, and session activity.

### 6.1 Song

Represents one song record in the user's library.

Potential fields:
- `id`
- `title`
- `artist`
- `album`
- `artwork`
- `duration`
- `bpm`
- `bpm_confidence`
- `genres`
- `tags`
- `mood`
- `energy`
- `external_references`
- `created_at`
- `updated_at`

### 6.2 Deck

Represents a reusable collection of songs.

Potential fields:
- `id`
- `name`
- `description`
- `owner_id`
- `visibility`
- `created_at`
- `updated_at`

### 6.3 Deck entry

Connects a song to a deck.

Potential fields:
- `id`
- `deck_id`
- `song_id`
- `position`
- `added_by`
- `added_at`
- `notes`

The same song can have multiple deck entries because it can appear in multiple decks.

### 6.4 Session

Represents a group activity.

Potential fields:
- `id`
- `name`
- `host_id`
- `mode`
- `status`
- `turn_order`
- `source_decks`
- `ruleset_id`
- `created_at`
- `ended_at`

### 6.5 Session entry

Represents a song added during a session.

Potential fields:
- `id`
- `session_id`
- `song_id`
- `player_id`
- `position`
- `turn_number`
- `added_at`
- `score`
- `evaluation`

### 6.6 Player

Represents a participant in a session.

Potential fields:
- `id`
- `display_name`
- `avatar`
- `session_role`

Account identity and session identity should remain separate enough to support guest participation later.

### 6.7 Ruleset

Represents an optional set of game rules.

Potential fields:
- `id`
- `name`
- `description`
- `rules`
- `scoring_configuration`
- `version`

A ruleset should operate on songs and session events without owning or duplicating the songs themselves.

---

## 7. External Music Services

### 7.1 General approach

The application should not depend on a single music provider for its entire existence.

Separate the following operations:

- **Import:** Bring existing songs or playlists into the application.
- **Export:** Create an external playlist from one of the application's decks.
- **Playback:** Open or play a song through a supported service.
- **Matching:** Connect an internal song record to the corresponding track or video on a provider.

A song record should remain useful even if an external provider is unavailable.

### 7.2 YouTube

YouTube playlist export is a potential early integration.

The YouTube Data API supports creating playlists and adding videos to them with user authorization.

The basic export process would be:

1. Match each song to a YouTube video.
2. Let the user review uncertain matches.
3. Create a playlist in the user's account.
4. Add the selected videos in deck order.
5. Store the resulting external playlist reference.

Important limitation: a YouTube video is not necessarily the official song recording. Matching must account for alternate versions, live performances, covers, duplicates, and unrelated results.

YouTube export should be treated as a playlist integration, not as permission to download or redistribute music.

### 7.3 Spotify

Spotify is a significant policy risk for this particular concept.

Spotify's current Developer Policy explicitly prohibits creating games using the Spotify Platform. It also restricts analyzing Spotify Content or the Spotify Service to create derived metrics or functionality.

That means the app should **not assume Spotify can supply the metadata, playback, or scoring system for the game**.

Spotify's 2026 developer-access changes also impose significant limits on Development Mode applications.

The product should therefore avoid making Spotify a required dependency for the core game or its compatibility calculations.

### 7.4 Apple Music

Apple Music's MusicKit supports catalog search, playback, and user-authorized playlist creation.

It is a potential integration to investigate separately. Its current terms and capabilities should be checked before committing to a specific game or playback design.

### 7.5 Provider-independent metadata

The app should investigate music metadata sources that permit the intended use.

Metadata providers must be evaluated for:
- Licensing.
- Attribution requirements.
- Commercial-use restrictions.
- API limits.
- Data accuracy.
- Availability of BPM and genre information.
- Artwork rights.

User-created tags and metadata should remain possible regardless of the provider.

---

## 8. Multiplayer and Session Behavior

### 8.1 Turn order

A session should support an arbitrary number of participants.

The turn order should be explicit and visible.

Potential controls:
- Current participant.
- Next participant.
- Previous participant.
- Skip or pass.
- Host control.
- Reordering, if enabled by the session rules.

### 8.2 Shared session state

All participants should see a consistent representation of:
- Participants.
- Current turn.
- Current song.
- Queue.
- Session mode.
- Scores, if enabled.
- Session history.

The design should eventually support participants on separate devices.

### 8.3 Session history

When a session ends, its song sequence should be preservable as a deck.

This creates a natural bridge between listening and collection:

**A session can produce a reusable playlist.**

Users should be able to save the resulting deck to their library and continue editing it later.

---

## 9. Visual and Interaction Priorities

The interface should prioritize the following:

1. Browsing and finding songs.
2. Viewing songs as cards.
3. Creating and managing decks.
4. Adding songs to a deck or session.
5. Seeing the current session and turn order.
6. Understanding optional game feedback.

The application should not make the user navigate through game screens to perform ordinary playlist-management tasks.

The card system should make music more tangible and browsable, not add friction to simple actions.

---

## 10. Initial Scope and Development Priorities

The game is secondary to the music collection. Development should reflect that.

### Phase 1 — Music collection foundation

- Song library.
- Song records and metadata.
- Song card presentation.
- Conventional list browsing.
- Card-grid browsing.
- Search, sorting, and filtering.
- Create, edit, and reorder decks.
- Add a song to multiple decks.

### Phase 2 — Listening sessions

- Create and join sessions.
- Participant list.
- Turn order.
- Add songs to a shared queue.
- Session history.
- Save a completed session as a deck.

### Phase 3 — Music integrations

- Import song references.
- Match songs to external providers.
- Export decks to supported playlist services.
- Review and resolve uncertain matches.

### Phase 4 — Game mechanics

- Optional game mode.
- Compatibility evaluation.
- Scoring rules.
- Player feedback.
- Multiple rulesets.
- Hybrid listening and game sessions.

This ordering is provisional. The main objective is to establish the underlying song, deck, and session model before building more elaborate game mechanics.

---

## 11. Out of Scope for the Initial Version

Unless later adopted, the initial version does not require:

- Hosting or distributing music files.
- Building a full streaming service.
- Replacing existing music players.
- Advanced DJ mixing tools.
- Automatic AI-generated playlists.
- A large competitive matchmaking system.
- A complex economy or collectible-card marketplace.
- A fixed scoring system that every session must use.

These ideas may be revisited if they become useful, but they should not delay the core collection and listening experience.

---

## 12. Existing Applications and Prior Art

These examples are references for specific parts of the concept. They are not all direct competitors, and none should be assumed to provide the entire intended system.

### 12.1 Steam — Library browsing reference

**Reference:** https://store.steampowered.com/

Steam is a visual and interaction reference for browsing a collection of individually represented items.

Relevant ideas:
- Conventional list and grid browsing.
- Collection-oriented navigation.
- Visual tiles with recognizable artwork.
- Detailed views for individual items.

The goal is not to copy Steam's interface, but to use a familiar library pattern for song browsing.

### 12.2 Pass the AUX — Existing shared playlist app

**Reference:** https://apps.apple.com/us/app/pass-the-aux/id1451423149

An existing iOS app lets people create a shared room and add songs to a common playlist.

Relevant overlap:
- Shared music sessions.
- Multiple participants contributing songs.
- A group playlist experience.

This is a direct naming and product-concept overlap. The working title needs further consideration.

### 12.3 Aux — Collaborative office music

**Reference:** https://www.onaux.app/

A collaborative music application focused on fair turn-taking and voting.

Relevant ideas:
- Turn rotation.
- Shared music queues.
- Participant voting.
- Group listening.

### 12.4 Soundcards — Music party game

**Reference:** https://www.soundcardsgame.com/

A social music game in which players submit songs that match a drawn genre or theme card. A judge selects a winner.

Relevant ideas:
- Music as the central game material.
- Card-based prompts.
- Multiplayer sessions.
- Song submissions and scoring.

Key difference: Soundcards is primarily a game. This project is intended to be a music library and playlist application first.

### 12.5 Who's AUX — Music prompt card game

**Reference:** https://whosaux.com/pages/card-game

A physical music party game where players choose songs to answer prompts and defend their selections.

Relevant ideas:
- Music as a form of expression.
- Subjective player judgment.
- Song choices as social interaction.
- The value of discovering music through other people.

### 12.6 Mixtape Hero — Social music discovery

**Reference:** https://mixtapehero.app/

A social music application built around themes, song submissions, listening, voting, and discovery.

Relevant ideas:
- Theme-based music sharing.
- Group participation.
- Voting and reactions.
- Building playlists through social interaction.

### 12.7 Bopster — Playlist-to-card system

**Reference:** https://bopster.app/en

Bopster lets users build playlists, create digital or printable music cards, and play music guessing games.

Relevant ideas:
- Converting playlists into cards.
- Custom card design.
- Playlist import.
- Digital and physical card experiences.

This is particularly relevant to the relationship between music collections and card representations.

### 12.8 CHT.SO — Shared music queue

**Reference:** https://cht.so/music

A shared music queue with a host-controlled playback experience and guest contributions.

Relevant ideas:
- A host-controlled session.
- Guests adding songs.
- Shared queue visibility.
- Separating playback control from song submission.

### 12.9 Small Victories — Pass the Aux DJ project

**Reference:** https://www.small-victories.co/projects/pass-the-aux

A browser-based DJ booth with guest song requests, queue management, tempo tools, and mixing controls.

Relevant ideas:
- Guest participation.
- Shared music sessions.
- A central playback host.
- Queue management.

This is more DJ-oriented than the intended product.

### 12.10 Prior-art conclusion

The individual pieces of the concept already exist in different forms:

- Steam demonstrates familiar collection browsing.
- Collaborative music apps demonstrate shared queues and turn-taking.
- Social music apps demonstrate theme-based discovery and voting.
- Music party games demonstrate card-based song selection and scoring.
- Bopster demonstrates playlist-to-card conversion.

The potential distinction is the combination:

**A music collection where every song is a card, every deck is a reusable playlist, and every session can be ordinary collaborative listening or an optional music game.**

The product should compete on the coherence of that combined experience rather than claiming that shared playlists or music cards are new inventions.

---

## 13. Development Workflow

### 13.1 Adopted workflow

This project adopts:

**Development State Machine Workflow v1.6.0**

Canonical reference:
https://github.com/KRMRGold/Meta-Modules/blob/main/workflows/Development-State-Machine-Workflow.md

The project follows the current canonical workflow by default. The recorded version establishes initial adoption provenance; it is not a permanent pin to an old revision.

### 13.2 Development states

| State | Name | Purpose |
|---|---|---|
| S0 | Request or idea | Understand the goal and constraints |
| S1 | Initial design | Describe intended behavior and scope |
| S2 | Design refinement | Resolve ambiguity, risks, and contradictions |
| S3 | Ready to implement | Confirm decisions and acceptance criteria |
| S4 | Implementation | Build a versioned candidate |
| S5 | Source inspection | Inspect changes and static checks |
| S6 | Runtime and acceptance testing | Execute the candidate and verify behavior |
| S7 | Acceptance gate | Decide whether required checks passed |
| S8 | Repair and iteration | Preserve failures, fix them, and retest |
| S9 | Maintenance update | Record accepted implementation and evidence |
| S10 | Accepted feature and next decision | Continue, defer, or finish the agreed scope |
| S11 | Milestone document | Reconcile the accepted app and its documentation |

### 13.3 Transition flow

S0 → S1 → S2 → S3 → S4 → S5 → S6 → S7

At S7:

- If required checks fail, move to S8.
- If the design needs revision, return to S2.
- If implementation needs repair, create a new candidate and return to S5.
- If required checks pass, move to S9.
- After maintenance is updated, move to S10.
- When the user declares the desired scope complete, move to S11.

The last accepted version must remain recoverable throughout implementation and repair.

### 13.4 Versioning and document policy

- Use Semantic Versioning for independently versioned code/build artifacts.
- Keep one canonical initial design document.
- Keep one canonical maintenance document.
- Keep one canonical milestone document when needed.
- Update living documents in place.
- Use Git history for previous document revisions.
- Do not create version-suffixed copies of living documents.
- Preserve failed code candidates and their evidence.
- A higher version number does not automatically mean a candidate is accepted.

### 13.5 Testing and verification

Use the Meta-Modules Testing and Verification module:

https://github.com/KRMRGold/Meta-Modules/blob/main/modules/testing-and-verification.md

Testing should cover:
- Song creation and editing.
- Song membership in multiple decks.
- Deck ordering and persistence.
- Switching between list and card views.
- Session creation and joining.
- Turn-order transitions.
- Adding songs to sessions.
- Saving sessions as decks.
- Provider matching and export failures.
- Persistence and recovery after interruptions.
- Compatibility with previously saved data.

Tests should be derived from observable acceptance criteria and executed against the exact candidate being evaluated.

Report results as:
- PASS
- FAIL
- BLOCKED
- NOT RUN

Do not treat a designed feature as implemented or an unexecuted test as passed.

---

## 14. Relevant Meta-Modules

The following modules inform the project's collaboration and development process.

### Foundational modules

**PAFC — Prior-Art-First Collaboration**  
https://github.com/KRMRGold/Meta-Modules/blob/main/modules/pafc.md

Investigate existing approaches and established solutions before inventing new systems.

**Intent & Clarity**  
https://github.com/KRMRGold/Meta-Modules/blob/main/modules/intent-and-clarity.md

Preserve the intended product direction, clarify consequential ambiguity, and avoid unnecessary questions.

**Discovery & Exploration**  
https://github.com/KRMRGold/Meta-Modules/blob/main/modules/discovery-and-exploration.md

Identify useful capabilities, approaches, and adjacent opportunities without taking over the project's direction.

**Capability & Agency**  
https://github.com/KRMRGold/Meta-Modules/blob/main/modules/capability-and-agency.md

Keep the user in control of important decisions while using tools and workflows to make meaningful progress.

### Specialized research module

**Existing Knowledge & Emerging Technologies**  
https://github.com/KRMRGold/Meta-Modules/blob/main/modules/existing-knowledge-and-emerging-technologies.md

Use for deeper research into music APIs, metadata sources, multiplayer architecture, and relevant technologies.

### Specialized development module

**Testing and Verification**  
https://github.com/KRMRGold/Meta-Modules/blob/main/modules/testing-and-verification.md

Use alongside the Development State Machine Workflow when implementing and maintaining software.

### Tool boundaries

**Tool Use and Consent Boundaries**  
https://github.com/KRMRGold/Meta-Modules/blob/main/modules/tool-use-consent.md

Follow the project's applicable tool-use restrictions and approval boundaries when working with AI assistance.

---

## 15. Open Decisions

These questions remain unresolved and should be addressed when they materially affect the next design or implementation stage.

1. **Project name:** What name should replace or distinguish the working title?
2. **Initial platform:** Should the first implementation target web, desktop, mobile, or a combination?
3. **Playback model:** Should music play through external providers, a host device, or a supported embedded player?
4. **Metadata sources:** Which sources can provide usable song metadata and BPM under acceptable licensing and API terms?
5. **Accounts and sharing:** What should be available to guests, and what requires an account?
6. **Session hosting:** Should sessions require a host, or should participants share control equally?
7. **Deck visibility:** Should decks be private by default, shareable by link, or discoverable publicly?
8. **Game rules:** Which initial game rules would be worth testing after the collection and listening experience exists?

These are design questions, not commitments to implement every possible option.

---

## 16. Initial Acceptance Criteria

The initial product foundation should be considered successful when:

- A user can create and maintain a song library.
- A song can be represented as a card.
- The same collection can be browsed in list and card views.
- A user can create multiple decks.
- A song can belong to multiple decks without being duplicated.
- A user can reorder songs within a deck.
- A deck can be used independently of any game mode.
- The underlying data model can support a shared session.
- The design separates reusable collections from temporary session activity.
- The design leaves room for optional game rules without requiring them.

These criteria describe the initial foundation, not a completed application.

---

## 17. Current Project State

**State:** S1 — Initial design

**Status:** Concept / design draft

**Implemented:** Nothing established by this document.

**Verified:** Prior-art references and selected API documentation were researched; no application code or integration has been tested.

**Next development state:** S2 — Design refinement

**Immediate priorities:**
1. Refine the product name and identity.
2. Resolve the initial platform and playback assumptions.
3. Confirm the core library, deck, and session relationships.
4. Refine the first implementation scope.
5. Establish the project repository and canonical documentation paths.

The project should remain flexible during exploration. The design is a reference for development, not a requirement to implement every idea in this document.
