const express = require("express");
const { google } = require("googleapis");
const dotenv = require("dotenv");
const open = require("open");

dotenv.config(); // 加載 .env 檔案中的環境變數

const app = express();
const port = 3000;

// 初始化 OAuth2 客戶端
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,        // 這些憑證在 Google Cloud Console 設定中可以找到
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI     // 您在 .env 中設定的 redirect_uri
);

// 啟動 OAuth 流程，將用戶重定向至 Google 登入頁面
app.get("/auth", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube"], // YouTube API 權限
  });
  res.redirect(authUrl);
});

// 接收 Google 的授權回調，並使用授權碼獲取訪問令牌
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;  // 來自 Google 授權頁面的授權碼
  const { tokens } = await oauth2Client.getToken(code); // 用授權碼換取令牌
  oauth2Client.setCredentials(tokens);  // 設定訪問令牌

  // 存取 YouTube API
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  // 創建歌單
  const today = new Date();
  const monthName = today.toLocaleString("default", { month: "short" }).toLowerCase();
  const playlistTitle = `${monthName}_YourName`;  // 可以將 "YourName" 替換為您的名稱或邏輯

  const response = await youtube.playlists.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: playlistTitle,
        description: "由畢業製作自動建立",
      },
      status: {
        privacyStatus: "private",  // 設定為私密歌單
      },
    },
  });

  // 回傳成功訊息給用戶
  res.send(`
    <html>
      <head>
        <title>歌單創建成功</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background-color: #f4f4f9;
          }
          h1 {
            color: green;
          }
          p {
            font-size: 20px;
            color: #333;
          }
        </style>
      </head>
      <body>
        <h1>✅ 已成功建立歌單：${playlistTitle}</h1>
        <p>我將化為音樂伴你左右</p>
      </body>
    </html>
  `);
});

// 啟動伺服器
app.listen(port, () => {
  console.log(`伺服器啟動中：http://localhost:${port}/auth`);
  open(`http://localhost:${port}/auth`);  // 開啟瀏覽器並自動進入 Google 授權頁面
});
