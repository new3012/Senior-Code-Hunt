# Senior Code Hunt — GitHub และ VPS

เว็บทำงานด้วย Next.js และใช้พอร์ต `3002` เพื่อไม่ชนกับ NearDrink

## 1. นำขึ้น GitHub ครั้งแรก

สร้าง Repository ชื่อ `Senior-Code-Hunt` โดยยังไม่ต้องเพิ่ม README จากนั้นเปิด Terminal ในโฟลเดอร์นี้แล้วรัน:

```bash
git init
git branch -M main
git add .
git commit -m "Initial Senior Code Hunt"
git remote add origin https://github.com/USERNAME/Senior-Code-Hunt.git
git push -u origin main
```

เปลี่ยน `USERNAME` เป็นชื่อบัญชี GitHub ของเจ้าของ Repository

## 2. ตั้งค่า DNS

เพิ่ม DNS Record ที่ผู้ให้บริการโดเมน:

- Type: `A`
- Name: `seniorhunt`
- Value: IP ของ VPS
- TTL: Auto

## 3. ติดตั้งบน VPS ครั้งแรก

```bash
cd /var/www
sudo git clone https://github.com/USERNAME/Senior-Code-Hunt.git senior-code-hunt
sudo chown -R $USER:$USER /var/www/senior-code-hunt
cd /var/www/senior-code-hunt
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

รันคำสั่งที่ `pm2 startup` แสดงอีกครั้งหนึ่ง เพื่อให้เว็บเริ่มอัตโนมัติหลัง VPS รีสตาร์ต

## 4. ตั้งค่า Nginx

```bash
sudo cp nginx-seniorhunt.conf /etc/nginx/sites-available/seniorhunt
sudo ln -s /etc/nginx/sites-available/seniorhunt /etc/nginx/sites-enabled/seniorhunt
sudo nginx -t
sudo systemctl reload nginx
```

## 5. เปิด HTTPS ฟรี

```bash
sudo certbot --nginx -d seniorhunt.nexspacehub.com
```

เมื่อสำเร็จ เว็บจะเปิดได้ที่ `https://seniorhunt.nexspacehub.com`

## 6. อัปเดตเว็บครั้งต่อไป

บนคอมให้ดับเบิลคลิก `Deploy.bat` เพื่อ Push ขึ้น GitHub จากนั้นบน VPS รัน:

```bash
cd /var/www/senior-code-hunt
git pull origin main
npm ci
npm run build
pm2 restart senior-code-hunt
```

## ตรวจสอบเมื่อเว็บไม่ขึ้น

```bash
pm2 status
pm2 logs senior-code-hunt --lines 100
sudo nginx -t
sudo systemctl status nginx
```
