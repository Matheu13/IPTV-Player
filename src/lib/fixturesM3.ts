/**
 * Milestone 3 Test Fixtures (Scrubbed & Sanitized)
 * Covers:
 * - 3a: XMLTV XML Feed, Xtream get_simple_data_table EPG, Catchup timeshift specs
 * - 3b: VOD Movies catalogue, VOD Info metadata, Multi-season TV Series & Episodes
 * - 3c: Favorites initial state, Custom Bouquets, Channel override mappings
 */

export const FIXTURE_XMLTV_RAW = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE tv SYSTEM "xmltv.dtd">
<tv generator-info-name="Scrubbed-IPTV-EPG-Generator" source-info-url="http://epg.example.com">
  <channel id="ESPN.us">
    <display-name lang="en">ESPN HD US</display-name>
    <display-name lang="en">ESPN Live</display-name>
    <icon src="https://img.provider-cdn.com/icons/espn.png" />
  </channel>
  <channel id="CNN.us">
    <display-name lang="en">CNN International</display-name>
    <icon src="https://img.provider-cdn.com/icons/cnn.png" />
  </channel>
  <channel id="BBCOne.uk">
    <display-name lang="en">BBC One London</display-name>
    <icon src="https://img.provider-cdn.com/icons/bbcone.png" />
  </channel>

  <!-- ESPN Schedule -->
  <programme start="20260825160000 +0000" stop="20260825180000 +0000" channel="ESPN.us">
    <title lang="en">SportsCenter Live: Prime Time Analysis</title>
    <sub-title lang="en">Midday Edition</sub-title>
    <desc lang="en">Comprehensive highlights, expert breakdown, and trade rumors across major leagues.</desc>
    <category lang="en">Sports</category>
    <category lang="en">Live News</category>
    <star-rating><value>4/5</value></star-rating>
  </programme>
  <programme start="20260825180000 +0000" stop="20260825200000 +0000" channel="ESPN.us">
    <title lang="en">NBA Tonight: Eastern Conference Finals</title>
    <desc lang="en">Live pre-game studio analysis, locker room reports, and player keys to victory.</desc>
    <category lang="en">Basketball</category>
    <category lang="en">Live Sports</category>
  </programme>
  <programme start="20260825200000 +0000" stop="20260825230000 +0000" channel="ESPN.us">
    <title lang="en">Live NBA Playoffs: Game 5</title>
    <desc lang="en">Full live broadcast of Game 5 of the conference finals with full court coverage.</desc>
    <category lang="en">Basketball</category>
  </programme>

  <!-- CNN Schedule -->
  <programme start="20260825160000 +0000" stop="20260825173000 +0000" channel="CNN.us">
    <title lang="en">World News Headlines &amp; Financial Markets</title>
    <desc lang="en">Global economic updates, Wall Street closing bell, and geopolitics report.</desc>
    <category lang="en">News</category>
  </programme>
  <programme start="20260825173000 +0000" stop="20260825190000 +0000" channel="CNN.us">
    <title lang="en">Anderson Cooper 360</title>
    <desc lang="en">In-depth investigative reports, political accountability, and roundtable panels.</desc>
    <category lang="en">Current Affairs</category>
  </programme>

  <!-- BBC One Schedule -->
  <programme start="20260825160000 +0000" stop="20260825170000 +0000" channel="BBCOne.uk">
    <title lang="en">Planet Earth III: Ocean Depths</title>
    <desc lang="en">David Attenborough narrates groundbreaking 4K underwater marine discoveries.</desc>
    <category lang="en">Documentary</category>
  </programme>
  <programme start="20260825170000 +0000" stop="20260825180000 +0000" channel="BBCOne.uk">
    <title lang="en">BBC News at Six</title>
    <desc lang="en">National and international news from the BBC Newsroom.</desc>
    <category lang="en">News</category>
  </programme>
</tv>`;

export const FIXTURE_XTREAM_EPG_TABLE = {
  epg_listings: [
    {
      id: '20491',
      epg_id: 'ESPN.us',
      title: 'U3BvcnRzQ2VudGVyIExpdmU6IFByaW1lIFRpbWUgQW5hbHlzaXM=', // Base64 for "SportsCenter Live: Prime Time Analysis"
      lang: 'en',
      start: '2026-08-25 16:00:00',
      end: '2026-08-25 18:00:00',
      description: 'Q29tcHJlaGVuc2l2ZSBoaWdobGlnaHRzIGFuZCBleHBlcnQgYnJlYWtkb3duLg==', // Base64
      channel_id: '10452',
      start_timestamp: '1787673600',
      stop_timestamp: '1787680800',
      now_playing: 1,
      has_archive: 1,
    },
    {
      id: '20492',
      epg_id: 'ESPN.us',
      title: 'TkJBIFRvbmlnaHQgKExpdmUgQ291bnRkb3duKQ==', // Base64 for "NBA Tonight (Live Countdown)"
      lang: 'en',
      start: '2026-08-25 18:00:00',
      end: '2026-08-25 20:00:00',
      description: 'TGl2ZSBwcmUtZ2FtZSBzdHVkaW8gYW5hbHlzaXMu',
      channel_id: '10452',
      start_timestamp: '1787680800',
      stop_timestamp: '1787688000',
      now_playing: 0,
      has_archive: 1,
    },
  ],
};

export const FIXTURE_VOD_MOVIES = [
  {
    num: 1,
    name: 'Dune: Part Two (2024) [4K HDR]',
    stream_type: 'movie',
    stream_id: 8801,
    stream_icon: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=60',
    rating: '8.6',
    rating_5based: 4.3,
    added: '1710000000',
    category_id: '10',
    category_name: 'Sci-Fi & Fantasy',
    container_extension: 'mp4',
    custom_sid: '',
    direct_source: '',
    duration_secs: 9960, // 166 min
    duration_str: '2h 46m',
  },
  {
    num: 2,
    name: 'Oppenheimer (2023) [IMAX 1080p]',
    stream_type: 'movie',
    stream_id: 8802,
    stream_icon: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&auto=format&fit=crop&q=60',
    rating: '8.9',
    rating_5based: 4.5,
    added: '1695000000',
    category_id: '11',
    category_name: 'Drama & Biography',
    container_extension: 'mkv',
    custom_sid: '',
    direct_source: '',
    duration_secs: 10800, // 180 min
    duration_str: '3h 00m',
  },
  {
    num: 3,
    name: 'Spider-Man: Across the Spider-Verse (2023)',
    stream_type: 'movie',
    stream_id: 8803,
    stream_icon: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=500&auto=format&fit=crop&q=60',
    rating: '8.7',
    rating_5based: 4.4,
    added: '1690000000',
    category_id: '12',
    category_name: 'Animation & Action',
    container_extension: 'mp4',
    custom_sid: '',
    direct_source: '',
    duration_secs: 8400,
    duration_str: '2h 20m',
  },
];

export const FIXTURE_VOD_INFO_DUNE = {
  info: {
    movie_image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800',
    tmdb_id: '693134',
    name: 'Dune: Part Two',
    o_name: 'Dune: Part Two',
    cover_big: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200',
    release_date: '2024-03-01',
    episode_run_time: '166',
    youtube_trailer: 'Way9Dexny3w',
    director: 'Denis Villeneuve',
    actors: 'Timothée Chalamet, Zendaya, Rebecca Ferguson, Javier Bardem',
    cast: 'Timothée Chalamet, Zendaya, Rebecca Ferguson',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    plot: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    genre: 'Science Fiction, Adventure',
    rating_imdb: '8.6',
    duration_secs: 9960,
    duration: '02:46:00',
    video: {
      codec_name: 'hevc',
      width: 3840,
      height: 2160,
      fps: 24,
    },
    audio: {
      codec_name: 'eac3',
      channels: 6,
      sample_rate: 48000,
    },
  },
  movie_data: {
    stream_id: 8801,
    name: 'Dune: Part Two (2024)',
    container_extension: 'mp4',
  },
};

export const FIXTURE_SERIES_CATALOG = [
  {
    num: 1,
    name: 'Shogun (2024) [Season 1 Complete]',
    series_id: 9101,
    cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=60',
    plot: 'When a mysterious European ship is found marooned in a nearby fishing village, Lord Toranaga discovers secrets that could tip the scales of power in feudal Japan.',
    cast: 'Hiroyuki Sanada, Cosmo Jarvis, Anna Sawai',
    director: 'Rachel Kondo, Justin Marks',
    genre: 'Drama, History, War',
    releaseDate: '2024-02-27',
    rating: '8.8',
    rating_5based: 4.4,
    category_id: '20',
    category_name: 'Historical Drama',
  },
  {
    num: 2,
    name: 'Severance [Seasons 1 & 2]',
    series_id: 9102,
    cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60',
    plot: 'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.',
    cast: 'Adam Scott, Patricia Arquette, John Turturro',
    director: 'Ben Stiller',
    genre: 'Sci-Fi, Thriller, Mystery',
    releaseDate: '2022-02-18',
    rating: '8.7',
    rating_5based: 4.35,
    category_id: '21',
    category_name: 'Sci-Fi Thriller',
  },
];

export const FIXTURE_SERIES_INFO_SHOGUN = {
  seasons: [
    {
      air_date: '2024-02-27',
      episode_count: 3,
      id: 101,
      name: 'Season 1',
      overview: 'Lord Toranaga battles for his life as his enemies on the Council of Regents unite against him.',
      season_number: 1,
      cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500',
    },
  ],
  info: {
    name: 'Shogun',
    cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800',
    plot: 'When a mysterious European ship is found marooned in a nearby fishing village, Lord Toranaga discovers secrets.',
    cast: 'Hiroyuki Sanada, Cosmo Jarvis, Anna Sawai',
    director: 'Rachel Kondo',
    genre: 'Drama, History',
    releaseDate: '2024-02-27',
    rating: '8.8',
    backdrop_path: ['https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200'],
  },
  episodes: {
    '1': [
      {
        id: '91011',
        episode_num: 1,
        title: 'Chapter One: Anjin',
        container_extension: 'mp4',
        info: {
          duration_secs: 4200, // 70 min
          duration: '01:10:00',
          plot: 'Destinies converge in Japan when an English ship is marooned on the coast.',
          rating: 8.9,
          releasedate: '2024-02-27',
        },
      },
      {
        id: '91012',
        episode_num: 2,
        title: 'Chapter Two: Servants of Two Masters',
        container_extension: 'mp4',
        info: {
          duration_secs: 3600, // 60 min
          duration: '01:00:00',
          plot: 'Blackthorne’s arrival in Osaka creates chaos. Mariko is put in a difficult position.',
          rating: 9.1,
          releasedate: '2024-02-27',
        },
      },
      {
        id: '91013',
        episode_num: 3,
        title: 'Chapter Three: Tomorrow is Tomorrow',
        container_extension: 'mp4',
        info: {
          duration_secs: 3420, // 57 min
          duration: '00:57:00',
          plot: 'After a tragic assassination attempt, Toranaga must smuggle his allies out of Osaka.',
          rating: 9.0,
          releasedate: '2024-03-05',
        },
      },
    ],
  },
};
