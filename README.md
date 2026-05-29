效果图
<img width="1891" height="781" alt="image" src="https://github.com/user-attachments/assets/c954fe60-1170-4add-8579-c24c8160faad" />
<img width="1909" height="619" alt="image" src="https://github.com/user-attachments/assets/d6a09cca-92fe-4297-9751-d1254db0abe6" />
<img width="1906" height="683" alt="image" src="https://github.com/user-attachments/assets/a5c45061-3c24-4475-ab88-eac7a6038c55" />
<img width="772" height="734" alt="image" src="https://github.com/user-attachments/assets/f946e437-12a4-4028-9995-3920eaa0b715" />
<img width="762" height="758" alt="image" src="https://github.com/user-attachments/assets/57af256d-2ea4-459c-b1c0-8249dbdb0405" />

项目概览
ClickHouse Monitor — 一个 ClickHouse 数据库监控告警系统

技术栈：
Monorepo：pnpm workspaces
后端：Express 5 + PostgreSQL + Drizzle ORM + Zod 校验
前端：React 19 + Vite + TailwindCSS v4 + Recharts + Radix UI
运行时：Node.js 24

# Ubuntu 部署步骤
# 1. 环境准备
#安装 Node.js 24（推荐用 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 24
nvm use 24

#安装 pnpm
npm install -g pnpm

#安装 PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

#启动并检查 PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

#安装 Node.js 24（推荐用 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 24
nvm use 24

#安装 pnpm
npm install -g pnpm

#安装 PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

#启动并检查 PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 2. 创建数据库
sudo -u postgres psql

#在 psql 中执行：
CREATE DATABASE ck_monitor;
CREATE USER ck_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ck_monitor TO ck_user;
sudo -u postgres psql

# 3. 上传代码并安装依赖
#在你的 Ubuntu 服务器上
#如果用 git
git clone <your-repo-url> ck-main
cd ck-main

#或手动上传 zip
unzip ck-main.zip
cd ck-main

#安装依赖
pnpm install

#首次安装需要等待 pnpm 下载所有 catalog 包

# 4. 配置环境变量
#在 ck-main 根目录创建 .env 文件
cat > .env << 'EOF'
#PostgreSQL 连接字符串（替换为你的实际值）
DATABASE_URL=postgresql://ck_user:your_password@localhost:5432/ck_monitor

#API 服务端口（可选，默认 5000）
PORT=5000

#Node 环境
NODE_ENV=production
EOF

# 5. 数据库初始化
#推送 Schema 到数据库
pnpm --filter @workspace/db run push

#种子数据会自动写入（首次运行）
pnpm run dev

# 6. 生产构建
#类型检查 + 构建所有包
pnpm run build

# 7. 用 PM2 运行（推荐生产环境）
#安装 PM2
npm install -g pm2

#启动 API 服务
cd ck-main/artifacts/api-server
pm2 start dist/index.mjs --name ck-api

#启动前端预览（可选，前端开发模式）
#或用 nginx 反向代理 static build
cd ck-main/artifacts/ck-monitor
pm2 start npx --name ck-frontend -- vite preview --host

# 8. Nginx 反向代理（可选）
server {
    listen 80;
    server_name your-domain.com;

    #API 服务 -> :5000
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
    }

    #前端静态文件 -> :4173 (vite preview)
    location / {
        proxy_pass http://127.0.0.1:4173;
        proxy_http_version 1.1;
    }

# 9. 添加开机自启
pm2 save

pm2 startup
