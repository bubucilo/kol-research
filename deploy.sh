#!/bin/bash
set -e

SERVER="protonme@103.185.53.60"
SSH_KEY="$HOME/.ssh/id_ed25519"
SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no"
SCP="scp -i $SSH_KEY -o StrictHostKeyChecking=no"
REMOTE_APP="~/kol-research"
REMOTE_WEB="~/public_html/kol-research"

echo "=== Step 1: Build locally ==="
npm run build

echo "=== Step 2: Create remote directories ==="
$SSH $SERVER "mkdir -p $REMOTE_APP $REMOTE_WEB"

echo "=== Step 3: Upload standalone build ==="
$SCP -r .next/standalone/* $SERVER:$REMOTE_APP/
$SCP -r .next/static $SERVER:$REMOTE_APP/.next/static
$SCP -r public $SERVER:$REMOTE_APP/public
$SCP -r prisma $SERVER:$REMOTE_APP/prisma
$SCP -r src/generated $SERVER:$REMOTE_APP/src/generated
$SCP package.json package-lock.json $SERVER:$REMOTE_APP/
$SCP .env $SERVER:$REMOTE_APP/

echo "=== Step 4: Install PM2 and dependencies ==="
$SSH $SERVER "
export NVM_DIR=\"\$HOME/.nvm\"
[ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"
cd $REMOTE_APP
npm install --production 2>&1 | tail -5
npm install -g pm2 2>&1 | tail -3
"

echo "=== Step 5: Start Next.js with PM2 ==="
$SSH $SERVER "
export NVM_DIR=\"\$HOME/.nvm\"
[ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"
cd $REMOTE_APP
pm2 delete kol-research 2>/dev/null || true
pm2 start server.js --name kol-research --env production
pm2 save
pm2 list
"

echo "=== Step 6: Set up .htaccess for proxy ==="
$SSH $SERVER "
cat > $REMOTE_WEB/.htaccess << 'HTACCESS'
RewriteEngine On
RewriteBase /kol-research/

# Proxy to Next.js on port 3000
RewriteRule ^(.*)$ http://127.0.0.1:3000/kol-research/\$1 [P,L]
HTACCESS
"

echo ""
echo "=== DONE ==="
echo "Live at: https://protonmedia.co.id/kol-research"
echo ""
echo "To check status: ssh $SERVER 'pm2 list'"
echo "To view logs: ssh $SERVER 'pm2 logs kol-research'"