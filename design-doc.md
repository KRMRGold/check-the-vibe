---
name: Check the Vibe
type: project-design
version: 0.7.2
status: design-refinement
workflow: Development State Machine Workflow
workflow_version: 1.6.0
---

# Check the Vibe — Initial Design

**Working tagline:** Your music. Your deck. Your rules.

## 1. Project Overview

### 1.1 Core concept

Check the Vibe is a music-card collection, deck-building, and playlist application with social music-game mechanics built around the same underlying system.

The central idea is that **songs are represented as cards**.

A song card is a visual representation of a song and its information: title, artist, artwork, genre, tags, BPM, energy, mood, and other useful attributes.

Users can organize these song cards into **decks**, which function as playlists. Decks can be personal collections, themed playlists, collaborative collections, or sources for a group session.

The card-game aspect is part of the product's initial design, not a feature to exclude from the first version. Collection and playlist building provide the foundation, while scoring and game mechanics operate on the same cards and decks.

The same song library, cards, decks, and sessions should support several complementary experiences:

1. **Listen:** Play music in the app through supported playback routes, browse collections, and listen through decks.
2. **Create:** Import, build, reorganize, and share playlists and collections.
3. **Play:** Use song cards in turn-based games involving compatibility, tags, BPM, mood, creative choices, and scoring.
4. **Party:** Host a Jackbox-style group experience where one screen presents the game and participants join and interact from their own phones or devices.

These are different ways to use the same underlying music system, not separate products. The application should remain useful for ordinary personal listening and playlist management without requiring multiplayer or game participation. Game mechanics and an initial testable scoring/compatibility mechanic remain part of the initial product design.

### 1.2 Design principle

**One music collection, multiple experiences.** Listening, playlist creation, card games, and party sessions should share the same underlying songs, decks, and session model.

A song should not need to be recreated for every playlist or game. It should have one reusable identity in the user's collection and be referenced by any number of decks and sessions.

The card is a way to browse and interact with a song, not a separate copy of the song. An imported playlist should become a deck while also making its identified songs available as reusable cards in the library. Users can reorganize those cards into new decks without altering the imported deck.

### 1.3 Product identity

The aesthetic should draw from underground music culture, DIY music scenes, punk flyers, physical card games, record collections, and music magazines.

It should feel like a place to collect and share music rather than a conventional streaming service.

The visual identity should support:
- Music discovery and personal taste.
- Collecting and organizing songs.
- Sharing music with friends.
- Customizable decks and song cards.
- An optional competitive or cooperative game experience.

The initial target is a **desktop application**. The design should not assume that users must create a Check the Vibe account to use ordinary collection and playlist features. Authentication should be requested only when a connected external service requires it for a specific operation.

The product is named **Check the Vibe**. The earlier working title, **Pass the Aux**, is no longer the product name; it may remain a possible name for a specific game mode, but that has not been decided.

---

## 2. Product Structure

The product is organized around four related concepts.

### 2.1 Song library

The library is the user's collection of reusable song records. Songs may enter it through manual addition, playlist imports, or other supported music-data sources.

An imported playlist contributes its identified songs to the library while also being preserved as its own deck. Importing references and metadata does not require downloading audio files.

Users can:
- Import playlists from supported services such as YouTube without downloading their audio.
- Import song lists or other supported collections where source access and terms permit.
- Enrich imported song records with metadata from available music databases and other permitted sources.
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

A deck is a reusable collection of songs. In ordinary use, a deck is effectively a playlist. A deck can be created manually, assembled from library cards, or created by importing an existing playlist.

An imported playlist has two related outcomes:

1. **Imported deck:** Preserve the source playlist as a deck, including its ordering and available source references.
2. **Reusable library cards:** Add or match the playlist's songs to the user's library so they can be reused in other decks.

The imported deck and the library are not competing destinations. They are two views of the same import: one preserves the source collection, while the other makes its songs available for further organization.

Users can:
- Create a deck.
- Import a playlist as a deck.
- Add and remove songs.
- Reorder songs.
- Rename and describe a deck.
- Browse a deck in list or card view.
- Duplicate a deck.
- Share a deck.
- Export a deck to an external music service where supported.

A song can belong to multiple decks without being duplicated in the library. Editing or removing a song's membership in one deck must not silently delete the library card or change its membership in other decks. The imported deck should retain its original order unless the user explicitly edits that deck.

Each deck should have its own visibility setting, supporting:
- **Private:** visible only to its owner (and authorized collaborators, if collaboration is enabled).
- **Shareable by link:** accessible to people with the link.
- **Public:** discoverable by other users.

Visibility is configured per deck, not globally for the account.

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
- Participants and participant roles.
- Turn order and interaction state.
- Song queue.
- Current song and playback state.
- Session history.
- Optional game rules and scores.
- Optional host display and participant-device views, including a join code or QR-based entry flow for party sessions.

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
- Party games / hosted sessions
- Shared with me
- Favorites
- Recently added

The exact navigation layout remains open to refinement. The product should feel like one application with distinct experiences or modes, rather than four disconnected applications.

### 3.3 Song card interactions

A song card should support:
- Selecting a song.
- Opening song details.
- Adding the song to a deck.
- Adding the song to a session.
- Playing or opening the song through a supported provider.
- Viewing its tags and attributes.

Card interactions should remain consistent between the library, deck, and session views. The same song card should remain recognizable and reusable across listening, playlist creation, ordinary game sessions, and party games.

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

#### 4.3.1 Song-card match flow

The core card-game direction is that players normally bring their own prepared song decks into a match. This is the standard constructed-deck format: each player selects songs from their reusable library and assembles a deck before play.

A match begins by selecting a random song card from an agreed pool. This opening song establishes the match's **initial Crowd Vibe** through its musical attributes, such as genre, mood, energy, and tempo. It gives every match a different starting atmosphere and a shared musical context for the turns that follow.

Players then take turns playing songs from their own decks. Each choice is evaluated in relation to the current Crowd Vibe, the songs already played, and the active ruleset. A choice can reinforce the current atmosphere, transition it in a new direction, deliberately contrast with it, or attempt to recover a declining vibe.

The match tracks two related but distinct measures:

- **Crowd Vibe:** The shared atmosphere of the match. It rises or falls as songs change the direction and energy of the crowd.
- **Player Reputation:** Each player's accumulated performance or contribution during the match. It reflects how successfully their choices satisfy the active rules and judging method.

These measures should not be conflated. A song might change the overall vibe in an unexpected direction while still earning its player recognition for a creative or strategically effective choice. The ruleset determines how these outcomes interact and whether either measure affects victory.

#### 4.3.2 Deck formats

Constructed decks are the normal play format: players bring their own prepared song decks.

The system should also leave room for booster and draft formats in which players receive or select from temporary song pools and build a deck as part of the match. These formats may use shared or randomized song selections and should not require every selected song to become a permanent addition to a player's library.

Both formats use the same underlying song cards, deck model, and ruleset system.

#### 4.3.3 Judging and crowd formats

The game should separate **what the rules consider a good play** from **who or what evaluates the play**. A ruleset defines the relevant criteria and consequences; a session's judging format determines the source of the evaluation.

Possible judging formats include:

- **Automatic evaluation:** The game evaluates a choice using the ruleset, song attributes, current Crowd Vibe, and match history. This supports competitive formats that should not let opponents directly upvote or downvote one another's choices.
- **Designated Judge:** A selected participant evaluates the submitted songs and chooses the one they think best answers the round or fits the current situation. This role may belong to the host, rotate between players, or be assigned in another way depending on the rules.
- **Group decision:** Players collectively vote or react to submissions. This is suited to social, party, or collaborative formats where group preference is intentionally part of the experience.
- **Audience / live crowd:** Spectators participate in judging without necessarily being active players. They can vote or react through their own devices.
- **Live chat:** A streaming audience, such as a streamer's chat, can act as the crowd through supported reactions or voting. The exact integration and moderation behavior remain open.

These formats are alternatives or configurable components, not requirements that every match combines. A host may judge while a separate audience influences Crowd Vibe, for example. Competitive rulesets should be able to disable opponent voting to avoid direct voting bias; social rulesets may deliberately use group or audience judgment.

The judging source can influence Crowd Vibe, Player Reputation, round outcomes, or some combination, as specified by the ruleset. The design should not assume that a crowd's popularity response is an objective measure of musical quality.

#### 4.3.4 Physical and digital play

The card game should be designed with both physical and digital play in mind, similar to the distinction between playing a tabletop trading-card game in person and playing a digital adaptation.

- **Physical play:** Players can use printed song cards and personal decks, take turns, and follow a ruleset in person. A host or group can judge choices using the agreed rules. The physical game should have a viable way to operate without requiring every player to use the app.
- **Digital play:** The app can manage digital song cards, personal decks, turn order, playback, scoring, judging, and online sessions.
- **Hybrid play:** People around a physical table can use the app as an optional companion for playback, scorekeeping, audience participation, or other supported functions. Remote participants or spectators may also be able to join a shared session.

The physical and digital experiences should share the same core game concepts and rules where practical. The app may add convenience and automation, but physical play should remain a deliberate design consideration rather than an afterthought.

### 4.4 Hybrid mode

A hybrid session combines ordinary listening with optional game mechanics.

Players take turns adding songs, the playlist grows, and the game evaluates choices or awards points.

The result should still be a usable playlist after the session ends.

This is important: the game should create something people actually want to listen to afterward.

### 4.5 Party mode

Party mode is a hosted, Jackbox-style experience built on the same session and song-card system.

A typical flow:

1. A host starts a party session on the desktop app or another supported main display.
2. The app presents a room code and/or QR code.
3. Participants join from their phones or other devices, with guest participation as a design goal where practical.
4. The main display presents the current round, shared music, queue, prompts, and results.
5. Participants use their own devices to submit songs, select cards, vote, answer prompts, or make other choices required by the ruleset.
6. The session updates the shared state and presents the outcome on the main display.

The host display and participant devices are different views of one session, not separate applications with separate game state. Party rules may be competitive or cooperative. A party session should be able to produce a deck or playlist that participants can keep after the session.

This describes a product direction, not a commitment to a particular networking architecture, account system, or first-release device matrix.

### 4.6 Shared experience model

The product should be structured as one application with multiple modes. Each mode uses the shared library, song cards, decks, playback capabilities, and—where relevant—sessions and rulesets.

The experience layer should not duplicate song records or create mode-specific copies of playlists. A song selected in a party game should still be the same library song; a playlist created during a game should be saveable as a deck; and a deck should remain usable for ordinary listening without launching a game.

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

Metadata should retain its source and confidence where appropriate. For example, an automatically estimated BPM should not be presented as unquestionably accurate. Imported metadata, calculated estimates, and user-added information should remain distinguishable, and users should be able to correct mistaken matches or values.

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
- **Duration and pacing:** Whether a song's length works in the context of the current playlist, round, or intended listening experience. A long song can sustain or deepen a vibe, but may also stall momentum; a short song can provide a sharp change or punctuation, but may feel abrupt or cut a developing atmosphere short.
- Overall listening flow.

Duration should be evaluated contextually rather than treated as a fixed penalty. A song being unusually long or short is not inherently incompatible; its effect depends on the surrounding sequence, the current vibe, and the kind of experience the players are trying to create.

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

The initial conceptual model should separate song identity, collection membership, and session activity. The model should remain independent of any one playback or metadata provider.

### 6.1 Song

Represents one reusable song record in the user's library. It is independent of any one playlist entry or external video.

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
- `external_references` (provider identifiers and links)
- `metadata_sources` (source and provenance for imported or calculated fields)
- `created_at`
- `updated_at`

### 6.2 Deck

Represents a reusable collection of songs. An imported playlist is represented as a deck with source information and preserved entry order.

Potential fields:
- `id`
- `name`
- `description`
- `owner_id`
- `visibility` (private, link-shareable, or public)
- `source_provider` (optional)
- `source_playlist_reference` (optional)
- `imported_at` (optional)
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
- `source_item_reference` (optional source playlist-item or video reference)

The same song can have multiple deck entries because it can appear in multiple decks. A deck entry may retain the original source item reference so the imported playlist can preserve its source link and distinguish different provider videos or versions that point to a matched song.

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
- `join_code` (optional)
- `participant_roles` (optional)
- `host_display_configuration` (optional)
- `judging_mode` (optional: automatic, host, group, audience, or live chat)
- `judge_id` (optional designated designated judge)
- `crowd_vibe_state` (optional session-level state)
- `audience_participants` (optional spectators who are not active players)
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
- `crowd_vibe_change` (optional)
- `player_reputation_change` (optional)

### 6.6 Player

Represents an active participant in a session. Spectators or audience members may be represented through a separate participant role or audience-participant record, depending on the eventual session architecture.

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

## 7. Technology Stack

The initial application is a **desktop-first, local-first Electron application**. The stack should stay deliberately lightweight: standard web technologies for the interface, Electron for desktop capabilities, and JSON files as the initial source of truth.

### 7.1 Selected technologies

| Area | Choice | Purpose |
|---|---|---|
| Desktop runtime | **Electron** | Package and run the application as a full desktop application, with access to desktop capabilities through controlled APIs. |
| Interface | **HTML, CSS, and plain JavaScript** | Build the renderer without adding a frontend framework. |
| UI framework | **None initially** | Do not introduce React, Vue, or another UI framework unless a demonstrated need justifies changing this decision. |
| Local data | **JSON files** | Store the user's library, song records, decks, preferences, and other application state in readable, portable files. JSON is the initial source of truth. |
| Desktop integration | **Electron main process and a secure preload bridge** | Keep privileged desktop operations out of the renderer and expose only the specific capabilities the interface needs. |
| Version control | **Git and GitHub** | Track source changes, preserve project history, and host the source repository. |

### 7.2 Application structure and security

Use Electron's process separation:

- **Main process:** Owns application lifecycle, native desktop integration, file access, and other privileged operations.
- **Renderer process:** Runs the HTML/CSS/JavaScript interface and handles presentation and user interaction.
- **Preload script:** Exposes a narrow, explicitly defined API between the renderer and main process. Do not expose unrestricted Node.js or filesystem access to the renderer.

Use Electron's security-oriented defaults and guidance:
- Enable context isolation.
- Keep Node.js integration disabled in renderer processes.
- Enable renderer sandboxing where compatible with the chosen Electron configuration.
- Validate and constrain requests crossing the preload bridge.
- Keep privileged operations in the main process rather than allowing arbitrary renderer access.

### 7.3 Data and backend direction

The initial design is local-first:

- JSON files are the initial persistence format and source of truth.
- Do not introduce a database or cloud backend for the initial application foundation.
- Ordinary library and deck use should not require a Check the Vibe account.
- External-service authentication is only needed when a specific provider operation requires it.
- Keep the data model and application boundaries open to a future synchronization or multiplayer service, but do not make that future service a dependency of local collection use.

The eventual storage layout, JSON file boundaries, backup/export behavior, and migration strategy remain implementation decisions. Avoid turning one large JSON document into an unmanageable store if the data naturally separates into multiple files; preserve referential consistency between songs, decks, and sessions.

### 7.4 Build and tooling decisions still open

The exact Electron packaging/build tool, development server or bundling approach, automated test framework, and supported desktop operating systems have not yet been selected. Choose these when implementation needs make the trade-offs concrete rather than adding tooling preemptively.

This section records the intended stack, not evidence that it has been implemented or tested.

---

## 8. External Music Services

### 8.1 General approach

The application should not depend on a single music provider for its entire existence.

Separate the following operations:

- **Import:** Bring existing playlists and song references into the application, without requiring audio downloads.
- **Metadata enrichment:** Match song records to permitted music databases and other sources to populate useful attributes.
- **Export:** Create an external playlist from one of the application's decks.
- **Playback:** Open or play a song through a supported service.
- **Matching:** Connect an internal song record to the corresponding track or video on a provider.

A song record should remain useful even if an external provider is unavailable. Importing a playlist should create a deck and make its matched songs reusable in the library; it should not download or copy the underlying audio.

The library and its song records are provider-independent. External services are integrations that may contribute metadata, matching, playback, import, or export capabilities; no single provider should define the app's underlying collection.

### 8.2 Playback routes

The intended playback model supports three routes, subject to each provider's technical capabilities and terms:

- **External providers:** connect to a supported music service and play through its authorized integration, or open the track in that service when direct playback is unavailable.
- **Local files:** play music files available on the host device, without requiring an external music account.
- **Embedded players:** use supported, authorized embedded players where the provider permits them.

Playback should be represented through a common app-level interface, while acknowledging that different providers expose different capabilities. The app must not assume that every provider supports the same controls, playback behavior, or metadata access.

### 8.3 YouTube

YouTube is a potential early import, export, and playback integration. It uses two separate APIs with different responsibilities:

- **YouTube Data API v3:** Search for videos, retrieve video and playlist metadata, read playlist entries, and—when the user authorizes it—create playlists and add videos.
- **YouTube IFrame Player API:** Embed and control YouTube playback in the application. It supports player controls and events such as ready, playing, paused, ended, and errors. It is the playback interface, not the app's canonical song-metadata source.

For import, the intended workflow is to read a user's playlist entries and their available identifiers and metadata through the Data API and required authorization. The app does not download the audio. Each entry is matched to a song record where possible; the playlist becomes an imported deck, and matched songs become reusable library cards.

For export, the YouTube Data API supports creating playlists and adding videos to them with user authorization.

The basic import process would be:

1. The user selects or provides a YouTube playlist.
2. Read the playlist's available video references and entry information through the supported API and required authorization.
3. Match each entry to a song record, using available music metadata sources to enrich the record.
4. Preserve the imported playlist as a deck, including its order and source-item references.
5. Add or match the identified songs in the reusable library, avoiding unnecessary duplicate song records.
6. Let the user review uncertain or ambiguous matches.

The basic export process would be:

1. Match each song in the deck to a YouTube video.
2. Let the user review uncertain matches.
3. Create a playlist in the user's account.
4. Add the selected videos in deck order.
5. Store the resulting external playlist reference.

Important limitation: a YouTube video is not necessarily the official song recording. Matching must account for alternate versions, live performances, covers, duplicates, and unrelated results.

#### YouTube API implementation notes

- Use `search.list` for user-directed video discovery and `videos.list` to retrieve details for selected video IDs. The latter can provide video title, channel, thumbnails, and duration.
- Use `playlists.list` and `playlistItems.list` for playlist information and ordered entries. User-owned private playlists and playlist creation/modification require the appropriate OAuth authorization; request only the scopes needed for the feature being used.
- Use `videos.list` for details on known IDs rather than repeatedly searching for the same item. Search is comparatively quota-expensive: the documented default allocation has a 10,000-unit daily quota, with search requests consuming 100 units and many list requests consuming 1 unit. Quotas can change and should be checked during implementation.
- Use the IFrame Player API for embedded playback, not downloaded or locally cached audio. Playback can fail when a video is removed, private, unavailable, or not permitted to play in an embed. Browser autoplay restrictions also apply.
- YouTube API data has specific storage and refresh requirements. API data generally must be refreshed or deleted within 30 days unless a stated policy exception applies. Keep YouTube-sourced metadata separate from independently sourced or user-entered song metadata, and design refresh/deletion behavior before persisting it.
- Follow YouTube's branding, attribution, user notice, privacy-policy, and API Terms requirements. Do not scrape YouTube or bypass embed restrictions.

YouTube export should be treated as a playlist integration, not as permission to download or redistribute music.

### 8.4 Spotify

Spotify is a significant policy risk for this particular concept.

Spotify's current Developer Policy explicitly prohibits creating games using the Spotify Platform. It also restricts analyzing Spotify Content or the Spotify Service to create derived metrics or functionality.

That means the app should **not assume Spotify can supply the metadata, playback, or scoring system for the game**.

Spotify's 2026 developer-access changes also impose significant limits on Development Mode applications.

The product should therefore avoid making Spotify a required dependency for the core game or its compatibility calculations.

### 8.5 Apple Music

Apple Music's MusicKit supports catalog search, playback, and user-authorized playlist creation.

It is a potential integration to investigate separately. Its current terms and capabilities should be checked before committing to a specific game or playback design.

### 8.6 Metadata APIs and song identification

The initial metadata approach should use a provider-independent song record, with external catalogs contributing information rather than defining the identity of a song.

#### Primary metadata source: MusicBrainz

Use the **MusicBrainz API (Web Service v2)** as the initial structured music-metadata source to investigate and integrate.

It supports search and lookup for entities including recordings, releases, release groups, and artists. It can provide useful identifiers and relationships for distinguishing recordings, releases, performers, and alternate versions. Prefer recording-level matches when identifying an individual song, and retain MusicBrainz IDs and ISRCs when available.

MusicBrainz does not require an API key for ordinary lookups, but requests must include a meaningful application User-Agent. Its published rate limit is approximately one request per second per source IP, so requests should be queued, throttled, and cached appropriately. The service is free for non-commercial use; confirm the applicable terms before any commercial use or monetized deployment.

#### Artwork: Cover Art Archive

Use the **Cover Art Archive** alongside MusicBrainz when release artwork is available. Artwork is associated with MusicBrainz release IDs, so it is not guaranteed for every recording or release. Preserve source attribution and follow the archive's image and data-use guidance. Do not assume every image is available for unrestricted redistribution.

#### Secondary catalog: Apple iTunes Search API

The **iTunes Search API** is a possible supplementary lookup source for track and album matching and additional catalog fields. It returns catalog search results in JSON and supports ID-based lookup.

Treat it as an optional enrichment/matching source, not the canonical identity system. Apple's terms limit promotional content such as artwork and audio previews to promotion of store content; preview audio and other promotional assets have additional display requirements. Do not use iTunes previews as a general playback source or assume its artwork can be reused freely in song cards.

Apple Music's separate MusicKit / Apple Music API may later be evaluated for authorized catalog access, playback, and playlist operations; that is distinct from the iTunes Search API.

#### Attributes that need another source or user input

Catalog APIs do not reliably provide every attribute the game wants. In particular, BPM, energy, danceability, mood, and transition compatibility should not be assumed to exist in a complete, consistently licensed form across catalogs.

Treat these as separate data classes:
- **Catalog metadata:** title, artist credits, release, recording identifiers, ISRC, release date, and available genre/tag information.
- **Provider metadata:** provider-specific IDs, links, video details, and service-specific fields.
- **Estimated musical attributes:** BPM or other measurements produced by a separately evaluated analysis method.
- **User-authored attributes:** tags, mood descriptions, ratings, corrections, and notes.
- **Game-derived values:** compatibility results, Crowd Vibe changes, and Player Reputation changes.

Every imported or estimated value should retain its source and, where useful, confidence and retrieval time. Conflicting catalog results should be presented as candidate matches for user review rather than silently merged.

#### Initial integration priority

1. MusicBrainz API for song/recording identification and core metadata.
2. Cover Art Archive for available release artwork.
3. YouTube Data API v3 for video discovery and playlist import/export.
4. YouTube IFrame Player API for embedded playback.
5. iTunes Search API as an optional secondary matching/enrichment source.

The exact provider mix may change after implementation testing and a review of licensing, terms, quota limits, and the intended public distribution model.

### 8.7 API and policy references

- [YouTube Data API overview](https://developers.google.com/youtube/v3/getting-started)
- [YouTube Data API reference](https://developers.google.com/youtube/v3/docs)
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- [YouTube API Services Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
- [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API)
- [MusicBrainz rate limiting](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting)
- [Cover Art Archive API](https://musicbrainz.org/doc/Cover_Art_Archive/API)
- [Apple iTunes Search API](https://performance-partners.apple.com/search-api)
- [Apple Music API](https://developer.apple.com/documentation/applemusicapi)
---

## 9. Multiplayer and Session Behavior

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

## 10. Visual and Interaction Priorities

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

## 11. Initial Scope and Development Priorities

The game is secondary to the music collection. Development should reflect that.

### Phase 1 — Music cards, imports, decks, and initial game foundation

- Import supported playlists, initially investigating YouTube.
- Convert an imported playlist into a deck while adding its matched songs as reusable library cards.
- Preserve imported playlist ordering and source references.
- Enrich song records using available, permitted metadata sources.
- Review and correct uncertain song matches.
- Song library.
- Song records and metadata.
- Song card presentation.
- Conventional list browsing.
- Card-grid browsing.
- Search, sorting, and filtering.
- Create, edit, and reorder decks.
- Add a song to multiple decks.
- Initial scoring and compatibility mechanics that operate on song cards and deck/session choices; these should be small and testable rather than deferred entirely to a later phase.

### Phase 2 — Listening and hosted sessions

- Create and join sessions.
- Participant list and turn order.
- Add songs to a shared queue.
- Explore the initial match flow: random opening song, initial Crowd Vibe, player turns, and separate Crowd Vibe / Player Reputation tracking.
- Define a first judging option, such as automatic evaluation or host judgment.
- Session history.
- Save a completed session as a deck.
- Explore a host-display and participant-device layout.
- Support a simple room-code or QR-code joining flow if the chosen architecture permits it.

### Phase 3 — Expanded music integrations

- Additional playlist and song-list import sources.
- Additional provider matching.
- Export decks to supported playlist services.
- Improve metadata enrichment and source reconciliation.

### Phase 4 — Expanded game and party experiences

- Additional game modes and rulesets.
- Constructed-deck play as the standard format, with optional booster/draft formats.
- Designated Judge, group-vote, audience, and live-chat judging options.
- Separate Crowd Vibe and Player Reputation systems.
- Physical, digital, and hybrid play support.
- More detailed compatibility evaluation.
- Expanded scoring rules and player feedback.
- Hybrid listening and game sessions.
- More complete Jackbox-style hosted party experiences, with a main display and participant-device interactions.

This ordering is provisional. The main objective is to establish the underlying song, deck, and session model before building more elaborate game mechanics.

---

## 12. Out of Scope for the Initial Version

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

## 13. Existing Applications and Prior Art

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

## 14. Development Workflow

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
- Give this living design document its own internal SemVer version in the YAML front matter. This document version is independent of application/code release versions.
- Increment the document version when its contents materially change: **PATCH** for corrections and clarifications that do not change the design; **MINOR** for additive design changes or newly resolved decisions that preserve the overall direction; **MAJOR** for a fundamental redesign or incompatible change to the documented product direction.
- Update the single canonical `design-doc.md` in place. Git history preserves prior revisions; do not create version-suffixed copies.
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

## 15. Relevant Meta-Modules

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

## 16. Open Decisions

The following questions remain unresolved and should be addressed when they materially affect the next design or implementation stage. The product name, desktop-first target, optional app-account model, multi-route playback direction, and per-deck visibility options have been decided at the product-design level; implementation details and provider-specific capabilities still require verification.

1. **Musical attribute analysis:** Which approach should provide BPM, energy, mood, and other estimated attributes that catalog APIs do not reliably supply? Metadata catalog starting points are documented in Section 8; licensing and commercial-use details still need confirmation before deployment.
2. **Session hosting:** Which session types require a host, and which should allow participants to share control equally?
3. **Party participation:** Should party sessions allow guest participation without creating an account, and which participant devices should be supported initially?
4. **Game rules and judging:** Which initial rules should govern the random opening song, Crowd Vibe, Player Reputation, and song evaluation?
5. **Physical play:** What minimum rules, card information, and scoring aids are needed for a self-contained in-person version?
6. **Audience participation:** Which audience or live-chat interactions are worth supporting, and how should they be moderated?

These are design questions, not commitments to implement every possible option.

---

## 17. Initial Acceptance Criteria

The initial product foundation should be considered successful when:

- The app's initial target is desktop.
- Ordinary collection and playlist use does not require a Check the Vibe account.
- The app's music records are not dependent on a single external provider.
- A supported playlist can be imported without downloading its audio.
- An imported playlist is preserved as a deck with its source ordering.
- Songs identified during import become reusable library cards.
- A song card can be reused in newly created decks without changing the imported deck.
- Metadata can be enriched from available sources while retaining provenance and uncertainty.
- Playback architecture can accommodate external providers, local files, and supported embedded players.
- Decks support private, link-shareable, and public visibility settings.
- A user can create and maintain a song library.
- A song can be represented as a card.
- The same collection can be browsed in list and card views.
- A user can create multiple decks.
- A song can belong to multiple decks without being duplicated.
- A user can reorder songs within a deck.
- A deck can be used independently of any game mode.
- The underlying data model can support shared sessions and multiple session modes.
- The design separates reusable collections from temporary session activity.
- The same library, cards, and decks can support listening, playlist creation, games, and hosted party experiences without duplicating song records.
- A hosted party experience can present a main display and separate participant-device interactions from one shared session state.
- A match can begin with a random song card that establishes the initial Crowd Vibe.
- The game model distinguishes shared Crowd Vibe from individual Player Reputation.
- The design supports players bringing personal constructed decks as the normal format, while leaving room for booster/draft formats.
- Judging can be configured separately from the ruleset, including automatic evaluation, a designated judge, group voting, an audience, or live chat.
- Competitive rulesets can avoid opponent upvotes/downvotes when direct voting would introduce bias.
- The core game is designed to support physical, digital, and hybrid play.
- The design leaves room for optional game rules without requiring them.

These criteria describe the initial foundation, not a completed application.

---

## 18. Current Project State

**State:** S2 — Design refinement

**Status:** Concept / refined design draft

**Design document version:** 0.7.0

**Implemented:** Nothing established by this document.

**Verified:** Prior-art references and selected API documentation were researched; no application code or integration has been tested.

**Next development state:** S3 — Ready to implement, after the remaining design decisions and acceptance checks are sufficiently resolved

**Immediate priorities:**
1. Identify metadata sources and verify their licensing, permitted uses, and available fields.
2. Define the first playlist import flow, including how imported decks and reusable library cards are created and matched.
3. Decide how session hosting and participant control should work.
4. Define the initial match loop: random opening song, Crowd Vibe, player turns, and Player Reputation.
5. Choose one first judging format and define observable scoring/compatibility acceptance checks.
6. Identify the minimum requirements for physical play without committing to a complete printed-card product.

The project should remain flexible during exploration. The design is a reference for development, not a requirement to implement every idea in this document.
