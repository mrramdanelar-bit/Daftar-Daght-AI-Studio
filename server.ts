import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/extract-bp', async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({
          error: 'يرجى إرسال صورة صالحة لتحليل قراءة الضغط الدموي.',
        });
        return;
      }

      const ai = createGeminiClient();
      if (!ai) {
        res.status(500).json({
          error: 'لم يتم تهيئة مفتاح الخدمة على الخادم. يرجى التحقق من إعدادات المفاتيح.',
        });
        return;
      }

      const cleanBase64 = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;
      const safeMime =
        typeof mimeType === 'string' && mimeType.startsWith('image/')
          ? mimeType
          : 'image/jpeg';

      const prompt = [
        'أنت أداة دقيقة لاستخراج قراءات أجهزة قياس الضغط الدموي من الصور (سواء شاشة جهاز رقمي أو ورقة قياسات مكتوبة).',
        'استخرج القيم التالية بدقة من الصورة:',
        '- systolic: الضغط الانقباضي (SYS / الرقم الأعلى بـ mmHg)، عدد صحيح بين 50 و 280. إذا لم يظهر أعد null.',
        '- diastolic: الضغط الانبساطي (DIA / الرقم السفلي بـ mmHg)، عدد صحيح بين 30 و 180. إذا لم يظهر أعد null.',
        '- pulse: معدل النبض (PUL / PULSE / /min)، عدد صحيح بين 30 و 220. إذا لم يظهر أعد null.',
        '- measuredAt: التاريخ والوقت الظاهر على شاشة الجهاز بصيغة نصية واضحة إن وجد (مثلاً 2026-10-26T10:15)، أو سلسلة فارغة إذا لم يكن واضحاً.',
        '- irregularHeartbeat: هل يظهر رمز عدم انتظام ضربات القلب (IHB / قلب مزدوج) على الشاشة؟',
        '- deviceDescription: وصف مختصر بالعربية لنوع الجهاز أو مصدر الصورة (مثلاً: جهاز قياس ضغط رقمي للعضد).',
        '- confidence: مستوى الثقة في القراءة (high أو medium أو low).',
        '- notes: ملاحظة موجزة ومفيدة بالعربية حول وضوح الشاشة أو أي رموز إضافية ظاهرة (لا تكتب نصائح طبية طويلة).',
        'تحقق مرتين من الأرقام السباعية (7-segment) لتجنب الخلط بين 3 و 8 أو 1 و 7.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: safeMime,
                data: cleanBase64,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              systolic: {
                type: Type.INTEGER,
                nullable: true,
                description: 'Systolic blood pressure in mmHg',
              },
              diastolic: {
                type: Type.INTEGER,
                nullable: true,
                description: 'Diastolic blood pressure in mmHg',
              },
              pulse: {
                type: Type.INTEGER,
                nullable: true,
                description: 'Pulse rate in beats per minute',
              },
              measuredAt: {
                type: Type.STRING,
                description: 'Detected date and time string or empty string',
              },
              irregularHeartbeat: {
                type: Type.BOOLEAN,
                description: 'Whether an irregular heartbeat symbol is visible',
              },
              deviceDescription: {
                type: Type.STRING,
                description: 'Short Arabic description of the device or image source',
              },
              confidence: {
                type: Type.STRING,
                description: 'Extraction confidence: high, medium, or low',
              },
              notes: {
                type: Type.STRING,
                description: 'Short Arabic note about screen readability or extra icons',
              },
            },
            required: [
              'systolic',
              'diastolic',
              'pulse',
              'measuredAt',
              'irregularHeartbeat',
              'deviceDescription',
              'confidence',
              'notes',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          error: 'لم يتمكن النظام من قراءة البيانات من هذه الصورة. يرجى المحاولة بصورة أوضح.',
        });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json({ extracted: parsed });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'حدث خطأ أثناء تحليل الصورة.';
      console.error('Error in /api/extract-bp:', err);
      res.status(500).json({
        error: `تعذر استخراج القراءة من الصورة: ${message}`,
      });
    }
  });

  if (!isProduction) {
    // Serve a zero-WebSocket /@vite/client module when HMR is disabled in
    // Express middleware mode so CSS injection (updateStyle/removeStyle) and
    // import.meta.hot calls work cleanly without opening failing WebSockets.
    app.get('/@vite/client', (_req: Request, res: Response) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
let lastInsertedStyle;

export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => { lastInsertedStyle = undefined; }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement('afterend', style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}

export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}

export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}

export function injectQuery(url, queryToInject) {
  if (!url.startsWith('.') && !url.startsWith('/')) return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://localhost');
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + hash;
}

export class ErrorOverlay extends HTMLElement {}
`);
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
