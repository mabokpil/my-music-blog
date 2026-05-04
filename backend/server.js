import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.YOUTUBE_API_KEY;

app.use(cors({ origin: "http://127.0.0.1:5500" }));
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

const GENRE_MAP = {
  "k-pop":          "kpop 최신 플레이리스트",
  "k-indie":        "한국 인디음악 플레이리스트",
  "hip-hop korean": "한국 힙합 플레이리스트",
  "ballad korean":  "한국 발라드 플레이리스트",
  "lofi":           "lofi chill playlist",
};

app.get("/api/playlists", async (req, res) => {
  try {
    const genre = req.query.genre || "k-pop";
    const query = GENRE_MAP[genre] || genre;

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=playlist&maxResults=12&relevanceLanguage=ko&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("YouTube 에러:", data.error.message);
      return res.status(500).json({ error: data.error.message });
    }

    const playlists = data.items.map((item) => ({
      id: item.id.playlistId,
      name: item.snippet.title,
      description: item.snippet.channelTitle,
      images: [{ url: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || "" }],
      tracks: { total: 0 },
    }));

    res.json({ items: playlists });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "플레이리스트를 불러오지 못했어요." });
  }
});

app.get("/api/playlists/:id/tracks", async (req, res) => {
  try {
    const { id } = req.params;

    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${id}&maxResults=20&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const tracks = data.items
      .filter((item) => 
        item.snippet.title !== "Deleted video" && 
        item.snippet.title !== "Private video"
      )
      .map((item) => ({
        track: {
          id: item.snippet.resourceId.videoId,
          name: item.snippet.title,
          youtube_url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
          artists: [{ name: item.snippet.videoOwnerChannelTitle || "알 수 없음" }],
          album: {
            images: [{ url: item.snippet.thumbnails.medium?.url || "" }],
          },
        },
      }));

    res.json({ items: tracks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "트랙 정보를 불러오지 못했어요." });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "서버가 정상 작동 중이에요!" });
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
