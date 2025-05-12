// ✅ 完整 script.js 可直接貼上使用

let tokenClient;
let isAuthorized = false;
let selectedVideos = [];
let playlistId = '';

function gapiLoaded() {
  console.log("🔃 gapiLoaded 被呼叫");
  gapi.load("client", () => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: '727367841573-fh6clqvs243auo7qlip0iu3g87i20eq6.apps.googleusercontent.com',
      scope: 'https://www.googleapis.com/auth/youtube',
      callback: '' // 登入時再設定
    });
    console.log("🪄 tokenClient 初始化完成");
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const nicknameForm = document.getElementById('nicknameForm');
  const nicknameInput = document.getElementById('nickname');
  const playlistNameSpan = document.getElementById('playlistName');
  const finalPlaylistName = document.getElementById('finalPlaylistName');
  const playlistLink = document.getElementById('playlistLink');

  document.getElementById('loginBtn').addEventListener('click', () => {
    tokenClient.callback = async (tokenResponse) => {
      if (tokenResponse.error) {
        alert("授權失敗，請稍後再試");
        return;
      }

      await gapi.client.init({
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest"]
      });
      gapi.client.setToken(tokenResponse);
      isAuthorized = true;
      console.log("✅ 使用者登入成功！");

      document.getElementById('step1').classList.add('active');
      document.getElementById('view1').classList.add('active');
      document.getElementById('loginSection').style.display = 'none';
    };

    tokenClient.requestAccessToken();
  });

  nicknameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nickname = nicknameInput.value.trim();
    if (nickname) {
      const month = new Date().toLocaleString('default', { month: 'short' }).toLowerCase();
      const playlistName = `${nickname}_${month}`;
      playlistNameSpan.textContent = playlistName;
      finalPlaylistName.textContent = playlistName;

      document.getElementById('step1').classList.remove('active');
      document.getElementById('step2').classList.add('active');
      document.getElementById('view1').classList.remove('active');
      document.getElementById('view2').classList.add('active');
      document.getElementById('playlistInfo').style.display = 'block';
    }
  });

  document.getElementById('searchBtn').addEventListener('click', async () => {
    if (!isAuthorized || !gapi.client.youtube) {
      alert("⚠️ 尚未登入或 API 尚未初始化");
      return;
    }
    const query = document.getElementById('searchInput').value.trim();
    const resultsContainer = document.getElementById('searchResults');
    if (!query) {
      resultsContainer.innerHTML = `<div class="empty-state">請輸入搜尋關鍵字</div>`;
      return;
    }
    try {
      resultsContainer.innerHTML = `<div class="loading">搜尋中...</div>`;
      const response = await gapi.client.youtube.search.list({
        part: 'snippet',
        q: query,
        maxResults: 5,
        type: 'video'
      });
      const items = response.result.items;
      if (!items || items.length === 0) {
        resultsContainer.innerHTML = `<div class="empty-state">找不到相關影片 :(</div>`;
        return;
      }
      resultsContainer.innerHTML = '';
      items.forEach(item => {
        const videoId = item.id.videoId;
        const title = item.snippet.title;
        const div = document.createElement('div');
        div.className = 'song-item';
        div.innerHTML = `
          <p>${title}</p>
          <button class="primary-btn" data-video-id="${videoId}" data-title="${title}">加入</button>
        `;
        resultsContainer.appendChild(div);
      });
    } catch (error) {
      console.error("❌ 搜尋失敗：", error);
      resultsContainer.innerHTML = `<div class="empty-state">搜尋失敗，請稍後再試</div>`;
    }
  });

  document.getElementById('searchResults').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      const videoId = e.target.dataset.videoId;
      const title = e.target.dataset.title;
      if (selectedVideos.find(v => v.videoId === videoId)) {
        alert('這首歌已加入過！');
        return;
      }
      selectedVideos.push({ videoId, title });
      const selectedContainer = document.getElementById('selectedSongs');
      const emptyState = selectedContainer.querySelector('.empty-state');
      if (emptyState) emptyState.remove();
      const div = document.createElement('div');
      div.className = 'song-item';
      div.textContent = title;
      selectedContainer.appendChild(div);
    }
  });

  document.getElementById('nextToSaveBtn').addEventListener('click', async () => {
    const name = document.getElementById('playlistName').textContent;
    if (!name || !isAuthorized) return;
    try {
      const response = await gapi.client.youtube.playlists.insert({
        part: 'snippet,status',
        resource: {
          snippet: {
            title: name,
            description: '由 MyTunes 自動建立'
          },
          status: {
            privacyStatus: 'private'
          }
        }
      });
      playlistId = response.result.id;
      playlistLink.href = `https://www.youtube.com/playlist?list=${playlistId}`;
      playlistLink.textContent = '點此查看您的歌單';
      document.getElementById('step2').classList.remove('active');
      document.getElementById('step3').classList.add('active');
      document.getElementById('view2').classList.remove('active');
      document.getElementById('view3').classList.add('active');
    } catch (error) {
      console.error("❌ 建立歌單失敗：", error);
      alert("建立歌單失敗，請確認登入狀態與權限");
    }
  });

  document.getElementById('saveToAccountBtn').addEventListener('click', async () => {
    if (!playlistId || !isAuthorized) {
      alert("⚠️ 請先登入並建立歌單");
      return;
    }
    try {
      for (const song of selectedVideos) {
        await gapi.client.youtube.playlistItems.insert({
          part: 'snippet',
          resource: {
            snippet: {
              playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId: song.videoId
              }
            }
          }
        });
      }
      alert('✅ 已保存至您的帳號');
    } catch (error) {
      console.error("❌ 添加歌曲失敗：", error);
      alert("添加歌曲時發生錯誤，請確認登入狀態與 API 權限");
    }
  });

  document.getElementById('createNewBtn').addEventListener('click', () => {
    location.reload();
  });
});
