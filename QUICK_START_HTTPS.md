# Quick Start: HTTPS Setup

## 🚀 Development Setup (5 Minutes)

### Step 1: Install mkcert

**Windows (PowerShell as Admin)**:
```powershell
choco install mkcert
mkcert -install
```

**Linux**:
```bash
sudo apt install libnss3-tools
wget -O mkcert https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v1.4.4-linux-amd64
chmod +x mkcert
sudo mv mkcert /usr/local/bin/
mkcert -install
```

**macOS**:
```bash
brew install mkcert
mkcert -install
```

### Step 2: Generate Certificates

**Windows**:
```powershell
.\scripts\generate-dev-cert.ps1
```

**Linux/macOS**:
```bash
chmod +x scripts/generate-dev-cert.sh
./scripts/generate-dev-cert.sh
```

### Step 3: Start Services

**Windows**:
```powershell
.\scripts\start-dev-https.ps1
```

**Linux/macOS**:
```bash
chmod +x scripts/start-dev-https.sh
./scripts/start-dev-https.sh
```

### Step 4: Access Application

Open your browser and go to any of these URLs:
- **https://localhost**
- **https://127.0.0.1**
- **https://10.73.77.58** (your IP)
- **https://ufomum-abdula.ufomoviez.com** (your domain)

You should see:
- ✅ Green lock icon (Secure)
- ✅ No certificate warnings (after trusting mkcert CA)
- ✅ Application loads correctly

---

## 🔧 Manual Start (Alternative)

If scripts don't work, start manually:

```bash
# Set environment
export ENVIRONMENT=dev
export USE_HTTPS=true

# Start with HTTPS
docker-compose -f docker-compose.yml -f docker-compose.https.yml up -d
```

---

## ✅ Verify It Works

1. **Check HTTPS**: https://localhost (should show "Secure")
2. **Check API**: https://localhost/api/health (should return "healthy")
3. **Check Logs**: `docker-compose logs nginx` (no errors)
4. **Test Login**: Login should work
5. **Test VNC**: Create remote session, verify `wss://` URL

---

## 🐛 Troubleshooting

### Certificate Not Found
```powershell
# Regenerate certificates
.\scripts\generate-dev-cert.ps1
```

### Services Won't Start
```powershell
# Check logs
docker-compose logs

# Restart
docker-compose down
docker-compose -f docker-compose.yml -f docker-compose.https.yml up -d
```

### Browser Shows "Not Secure"
```powershell
# Reinstall mkcert CA
mkcert -install

# Clear browser cache
# Or regenerate certificates
.\scripts\generate-dev-cert.ps1
```

---

## 📚 More Information

- **Complete Guide**: See `README_SSL.md`
- **Testing**: See `TESTING_CHECKLIST.md`
- **Implementation**: See `HTTPS_INTEGRATION_PLAN.md`

---

## 🎯 Next Steps

1. ✅ HTTPS is working
2. Test all features (login, VNC, etc.)
3. Test from another device on LAN
4. When ready, set up production with Let's Encrypt

---

**That's it!** Your application is now running with HTTPS! 🔒

