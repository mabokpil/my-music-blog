const API_BASE = "https://my-music-blog-dwdj.onrender.com";

let currentGenre = "k-pop";
let currentSort = "popular";
let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
let memos = JSON.parse(localStorage.getItem("memos") || "[]");

const playlistGrid = document.getElementById("playlistGrid");
const spinner = document.getElementById("spinner");
const errorMsg = document.getElementById("errorMsg");
const searchInput = document.getElementById("searchInput");
const themeBtn = document.getElementById("themeBtn");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const memoSaveBtn = document.getElementById("memoSaveBtn");
const memoList = document.getElementById("memoList");

// ══════════════════════════════════════
// 플레이리스트
// ══════════════════════════════════════

async function loadPlaylists(genre, sort) {
  showSpinner(true);
  errorMsg.style.display = "none";
  playlistGrid.innerHTML = "";

  try {
    const url = `${API_BASE}/api/playlists?genre=${encodeURIComponent(genre)}&sort=${sort}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("서버 오류");
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      playlistGrid.innerHTML = `<p style="color:var(--text-sub);padding:40px 0">결과가 없어요.</p>`;
      return;
    }
    renderPlaylists(data.items.filter(Boolean));
  } catch (err) {
    console.error(err);
    errorMsg.style.display = "block";
  } finally {
    showSpinner(false);
  }
}

function renderPlaylists(items) {
  playlistGrid.innerHTML = "";

  items.forEach((playlist) => {
    const imgUrl =
      playlist.images?.[0]?.url || "https://placehold.co/300x300?text=PLLOG";
    const isFav = favorites.includes(playlist.id);

    const card = document.createElement("div");
    card.className = "playlist-card";
    card.innerHTML = `
      <div class="playlist-card-thumb">
        <img src="${imgUrl}" alt="${playlist.name}" loading="lazy" />
        <button class="playlist-card-fav" data-id="${playlist.id}">${isFav ? "❤️" : "🤍"}</button>
      </div>
      <div class="playlist-card-body">
        <div class="playlist-card-title">${playlist.name}</div>
        <div class="playlist-card-sub">${playlist.description || ""}</div>
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("playlist-card-fav")) return;
      openModal(playlist);
    });

    card.querySelector(".playlist-card-fav").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(playlist.id, e.target);
    });

    playlistGrid.appendChild(card);
  });
}

// ══════════════════════════════════════
// 정렬 탭
// ══════════════════════════════════════

document.querySelectorAll(".sort-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".sort-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentSort = btn.dataset.sort;
    loadPlaylists(currentGenre, currentSort);
  });
});

// ══════════════════════════════════════
// 검색
// ══════════════════════════════════════

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const query = searchInput.value.trim();
    if (query.length > 1) loadPlaylists(query, currentSort);
    else if (query.length === 0) loadPlaylists(currentGenre, currentSort);
  }, 500);
});

// ══════════════════════════════════════
// 모달
// ══════════════════════════════════════

async function openModal(playlist) {
  document.getElementById("modalImg").src = playlist.images?.[0]?.url || "";
  document.getElementById("modalTitle").textContent = playlist.name;
  document.getElementById("modalSubtitle").textContent =
    playlist.description || "";
  document.getElementById("trackList").innerHTML =
    `<p style="color:var(--text-sub);padding:20px 0;font-size:13px">로딩 중...</p>`;
  modalOverlay.classList.add("open");

  try {
    const res = await fetch(`${API_BASE}/api/playlists/${playlist.id}/tracks`);
    const data = await res.json();
    renderTracks(data.items || []);
  } catch {
    document.getElementById("trackList").innerHTML =
      `<p style="color:var(--text-sub);font-size:13px">트랙을 불러오지 못했어요.</p>`;
  }
}

function renderTracks(items) {
  const trackList = document.getElementById("trackList");
  trackList.innerHTML = "";

  if (items.length === 0) {
    trackList.innerHTML = `<p style="color:var(--text-sub);padding:20px 0;font-size:13px">트랙 정보가 없어요.</p>`;
    return;
  }

  items.forEach((item, index) => {
    const track = item.track;
    if (!track) return;

    const thumbUrl = track.album?.images?.[0]?.url || "";

    const div = document.createElement("div");
    div.className = "track-item";
    div.innerHTML = `
      <span class="track-num">${index + 1}</span>
      ${thumbUrl ? `<img class="track-thumb" src="${thumbUrl}" alt="" />` : ""}
      <div class="track-info">
        <div class="track-name">${track.name}</div>
        <div class="track-artist">${track.artists.map((a) => a.name).join(", ")}</div>
      </div>
      <button class="track-play-btn" title="유튜브에서 보기">▶</button>
    `;

    div.querySelector(".track-play-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      window.open(track.youtube_url, "_blank");
    });

    div.addEventListener("click", () => {
      window.open(track.youtube_url, "_blank");
    });

    trackList.appendChild(div);
  });
}

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
function closeModal() {
  modalOverlay.classList.remove("open");
}

// ══════════════════════════════════════
// 즐겨찾기
// ══════════════════════════════════════

function toggleFavorite(id, btn) {
  const idx = favorites.indexOf(id);
  if (idx === -1) {
    favorites.push(id);
    btn.textContent = "❤️";
  } else {
    favorites.splice(idx, 1);
    btn.textContent = "🤍";
  }
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

// ══════════════════════════════════════
// 메모
// ══════════════════════════════════════

function saveMemo() {
  const title = document.getElementById("memoTitle").value.trim();
  const content = document.getElementById("memoContent").value.trim();
  if (!title && !content) return;

  memos.unshift({
    id: Date.now(),
    title: title || "제목 없음",
    content,
    date: new Date().toLocaleDateString("ko-KR"),
  });
  localStorage.setItem("memos", JSON.stringify(memos));
  document.getElementById("memoTitle").value = "";
  document.getElementById("memoContent").value = "";
  renderMemos();
}

function deleteMemo(id) {
  memos = memos.filter((m) => m.id !== id);
  localStorage.setItem("memos", JSON.stringify(memos));
  renderMemos();
}

function renderMemos() {
  memoList.innerHTML = "";
  if (memos.length === 0) {
    memoList.innerHTML = `<p style="font-size:12px;color:var(--text-sub);text-align:center;padding:8px">메모가 없어요</p>`;
    return;
  }
  memos.forEach((memo) => {
    const div = document.createElement("div");
    div.className = "memo-item";
    div.innerHTML = `
      <button class="memo-delete-btn">✕</button>
      <div class="memo-item-title">${memo.title}</div>
      <div class="memo-item-content">${memo.content}</div>
      <div class="memo-item-date">${memo.date}</div>
    `;
    div
      .querySelector(".memo-delete-btn")
      .addEventListener("click", () => deleteMemo(memo.id));
    memoList.appendChild(div);
  });
}

memoSaveBtn.addEventListener("click", saveMemo);

// ══════════════════════════════════════
// 다크모드
// ══════════════════════════════════════

function initTheme() {
  if (localStorage.getItem("theme") === "dark") applyDark(true);
}
function applyDark(isDark) {
  document.body.classList.toggle("dark", isDark);
  themeBtn.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("theme", isDark ? "dark" : "light");
}
themeBtn.addEventListener("click", () => {
  applyDark(!document.body.classList.contains("dark"));
});

// ══════════════════════════════════════
// 장르 버튼
// ══════════════════════════════════════

document.querySelectorAll(".genre-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".genre-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentGenre = btn.dataset.genre;
    searchInput.value = "";
    loadPlaylists(currentGenre, currentSort);
  });
});

// ══════════════════════════════════════
// 유틸 & 초기 실행
// ══════════════════════════════════════

function showSpinner(show) {
  spinner.style.display = show ? "flex" : "none";
}

initTheme();
renderMemos();
loadPlaylists(currentGenre, currentSort);
