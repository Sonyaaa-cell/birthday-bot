const axios = require("axios");

const BOT_TOKEN = process.env.BOT_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const SHEET_NAME = "Лист1";
const PAYMENT_DETAILS = "891642507 АЛЬФА-БАНК ";

async function getTable() {
  const url =
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq` +
    `?sheet=${encodeURIComponent(SHEET_NAME)}&tqx=out:csv`;

  const response = await axios.get(url);
  return response.data;
}

function parseCSV(csv) {
  return csv
    .trim()
    .split("\n")
    .map(row => {
      const result = [];
      let current = "";
      let quotes = false;

      for (let i = 0; i < row.length; i++) {
        const char = row[i];

        if (char === '"') {
          quotes = !quotes;
        } else if (char === "," && !quotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }

      result.push(current.trim());
      return result.map(x => x.replace(/^"|"$/g, ""));
    });
}

async function sendMessage(chatId, text) {
  await axios.post(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      chat_id: chatId,
      text
    }
  );
}

async function main() {
  console.log("Бот запущен");

  const csv = await getTable();
  const rows = parseCSV(csv);

  // Первая строка — заголовки:
  // ФИО | Дата | TG ID

  const participants = rows.slice(1);

  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");

  for (const person of participants) {
    const name = person[0];
    const birthday = person[1];
    const tgId = person[2];

    if (!name || !birthday || !tgId) continue;

    const date = String(birthday)
      .replace(/\//g, ".")
      .replace(/-/g, ".");

    const birthdayParts = date.split(".");

    if (birthdayParts.length < 2) continue;

    const birthdayDay = birthdayParts[0].padStart(2, "0");
    const birthdayMonth = birthdayParts[1].padStart(2, "0");

    if (birthdayDay !== day || birthdayMonth !== month) {
      continue;
    }

    for (const other of participants) {
      const otherName = other[0];
      const otherTgId = other[2];

      if (!otherName || !otherTgId) continue;

      // Имениннику сообщение НЕ отправляем
      if (String(otherTgId) === String(tgId)) continue;

      await sendMessage(
        otherTgId,
        `🎂 Сегодня день рождения у ${name}!\n\n` +
        `💰 Напоминаю про сбор — 250 ₽.\n\n` +
        `💳 ${PAYMENT_DETAILS}\n\n` +
        `Спасибо ❤️`
      );
    }
  }

  console.log("Готово");
}

main().catch(error => {
  console.error(error.response?.data || error.message);
  process.exit(1);
});
