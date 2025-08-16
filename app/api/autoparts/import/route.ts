import db from "@/lib/db/db";

export async function POST(req: Request) {
  const rows = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const total = rows.length;
        let processed = 0;

        for (const row of rows) {
          const article = row["артикул"]?.trim();
          if (!article) continue;

          const exists = await db.autoparts.findUnique({ where: { article } });
          if (exists) {
            processed++;
            send({ progress: Math.round((processed / total) * 100) });
            continue;
          }

          // category
          let category = null;
          if (row["группа"]) {
            category = await db.categories.findFirst({
              where: { name: row["группа"].trim() },
            });
            if (!category) {
              category = await db.categories.create({
                data: { name: row["группа"].trim() },
              });
            }
          } else {
            category = await db.categories.findFirst({
              where: { name: "Unknown" },
            });
            if (!category) {
              category = await db.categories.create({
                data: { name: "Unknown" },
              });
            }
          }

          let brand = null;
          if (row["Бренд"]) {
            brand = await db.brands.findFirst({
              where: { name: row["Бренд"].trim() },
            });
            if (!brand) {
              brand = await db.brands.create({
                data: { name: row["Бренд"].trim() },
              });
            }
          } else {
            brand = await db.brands.findFirst({ where: { name: "China" } });
            if (!brand) {
              brand = await db.brands.create({ data: { name: "China" } });
            }
          }

          // auto
          let auto = null;
          if (row["auto"]) {
            auto = await db.auto.findFirst({
              where: { name: row["auto"].trim() },
            });
            if (!auto) {
              auto = await db.auto.create({
                data: { name: row["auto"].trim() },
              });
            }
          }

          // аналоги → TextForAuthopartsSearch
          let textForSearch = null;
          if (row["аналоги"]) {
            textForSearch = await db.textForAuthopartsSearch.findFirst({
              where: { text: row["аналоги"].trim() },
            });
            if (!textForSearch) {
              textForSearch = await db.textForAuthopartsSearch.create({
                data: { text: row["аналоги"].trim() },
              });
            }
          }

          let salePriceType = null;
          if (row["sale"]) {
            salePriceType = await db.priceTypes.findFirst({
              where: { name: row["sale"].trim() },
            });
            if (!salePriceType) {
              salePriceType = await db.priceTypes.create({
                data: { name: row["sale"].trim() },
              });
            }
          } else {
            salePriceType = await db.priceTypes.findFirst({
              where: { name: "Unknown" },
            });
            if (!salePriceType) {
              salePriceType = await db.priceTypes.create({
                data: { name: "Unknown" },
              });
            }
          }

          // Создаем Autopart
          const autopart = await db.autoparts.create({
            data: {
              article,
              description: row["описание"]?.trim() || "",
              brand_id: brand?.id,
              category_id: category?.id,
              auto_id: auto?.id || null,
              text_for_search_id: textForSearch?.id || null,
            },
          });

          // Цена sale
          if (row["ц"]) {
            await db.autopartPrices.create({
              data: {
                authopart_id: autopart.id,
                pricesType_id: salePriceType?.id,
                price: parseFloat(String(row["ц"]).replace(",", ".")) || 0,
              },
            });
          }

          processed++;
          send({ progress: Math.round((processed / total) * 100) });
        }

        send({ progress: 100, done: true });
        controller.close();
      } catch (e) {
        console.error(e);
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ error: "Ошибка при импорте" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
