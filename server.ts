import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log('Starting server initialization...');
  const app = express();
  const PORT = 3000;
  const activeBrowsers = new Map<string, any>();

  app.use(cors());
  app.use(express.json());

  console.log('Initializing database...');
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const db = new Database(path.join(dataDir, 'database.sqlite'));
  console.log('Database initialized.');

  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT,
      age INTEGER,
      gender TEXT,
      education TEXT,
      income TEXT,
      interests TEXT,
      location TEXT,
      proxy TEXT,
      behavior_traits TEXT
    );
  `);

  // Migration: Add location column if it doesn't exist
  try {
    db.prepare("ALTER TABLE profiles ADD COLUMN location TEXT").run();
  } catch (e) {
    // Column already exists
  }

  // Migration: Add proxy column if it doesn't exist
  try {
    db.prepare("ALTER TABLE profiles ADD COLUMN proxy TEXT").run();
  } catch (e) {
    // Column already exists
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY,
      profile_id TEXT,
      url TEXT,
      status TEXT,
      start_time DATETIME,
      end_time DATETIME,
      result TEXT,
      last_screenshot TEXT,
      FOREIGN KEY(profile_id) REFERENCES profiles(id)
    );

    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      survey_id TEXT,
      question TEXT,
      answer TEXT,
      context TEXT,
      FOREIGN KEY(survey_id) REFERENCES surveys(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      survey_id TEXT,
      type TEXT,
      payload TEXT,
      result TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Task API
  app.get('/api/tasks/pending', (req, res) => {
    const task = db.prepare("SELECT * FROM tasks WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1").get() as any;
    if (task) {
      res.json({ ...task, payload: JSON.parse(task.payload || '{}') });
    } else {
      res.status(404).json({ message: 'No pending tasks' });
    }
  });

  app.post('/api/tasks/:id/resolve', (req, res) => {
    const { id } = req.params;
    const { result } = req.body;
    db.prepare("UPDATE tasks SET result = ?, status = 'completed' WHERE id = ?").run(JSON.stringify(result), id);
    res.json({ success: true });
  });

  app.get('/api/surveys/:id/screenshot', (req, res) => {
    const { id } = req.params;
    const survey = db.prepare('SELECT last_screenshot FROM surveys WHERE id = ?').get(id) as any;
    if (survey?.last_screenshot) {
      res.json({ screenshot: survey.last_screenshot });
    } else {
      res.status(404).json({ message: 'No screenshot available' });
    }
  });

  // API Routes
  app.get('/api/profiles', (req, res) => {
    const profiles = db.prepare('SELECT * FROM profiles').all() as any[];
    res.json(profiles.map(p => ({
      ...p,
      interests: JSON.parse(p.interests || '[]'),
      location: JSON.parse(p.location || '{}'),
      behavior_traits: JSON.parse(p.behavior_traits || '{}')
    })));
  });

  app.post('/api/profiles', (req, res) => {
    const { name, age, gender, education, income, interests, location, proxy, behavior_traits } = req.body;
    const id = uuidv4();
    db.prepare(
      'INSERT INTO profiles (id, name, age, gender, education, income, interests, location, proxy, behavior_traits) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, name, age, gender, education, income, JSON.stringify(interests), JSON.stringify(location), proxy, JSON.stringify(behavior_traits));
    res.json({ id });
  });

  app.get('/api/stats', (req, res) => {
    const total = db.prepare('SELECT COUNT(*) as count FROM surveys').get() as any;
    const completed = db.prepare("SELECT COUNT(*) as count FROM surveys WHERE status = 'completed'").get() as any;
    const failed = db.prepare("SELECT COUNT(*) as count FROM surveys WHERE status = 'failed'").get() as any;
    
    const timePerSurvey = db.prepare(`
      SELECT 
        AVG(strftime('%s', end_time) - strftime('%s', start_time)) as avg_time 
      FROM surveys 
      WHERE status = 'completed'
    `).get() as any;

    res.json({
      total: total.count,
      completed: completed.count,
      failed: failed.count,
      avg_time: timePerSurvey?.avg_time || 0
    });
  });

  app.get('/api/surveys', (req, res) => {
    const surveys = db.prepare(`
      SELECT s.*, p.name as profile_name 
      FROM surveys s 
      JOIN profiles p ON s.profile_id = p.id
      ORDER BY s.start_time DESC
    `).all();
    res.json(surveys);
  });

  app.post('/api/surveys/run', (req, res) => {
    const { profile_id, url } = req.body;
    const survey_id = uuidv4();
    
    db.prepare(
      'INSERT INTO surveys (id, profile_id, url, status, start_time) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
    ).run(survey_id, profile_id, url, 'running');

    // Run automation in background
    runAutomation(survey_id, profile_id, url, db).catch(err => {
      console.error('Automation failed:', err);
      db.prepare("UPDATE surveys SET status = 'failed', end_time = CURRENT_TIMESTAMP WHERE id = ?").run(survey_id);
    });

    res.json({ survey_id });
  });

  app.post('/api/surveys/:id/stop', async (req, res) => {
    const { id } = req.params;
    const browser = activeBrowsers.get(id);
    if (browser) {
      await browser.close();
      activeBrowsers.delete(id);
    }
    db.prepare("UPDATE surveys SET status = 'failed', end_time = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    res.json({ success: true });
  });

  async function runAutomation(survey_id: string, profile_id: string, url: string, db: any) {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream'
      ]
    });
    activeBrowsers.set(survey_id, browser);
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profile_id) as any;
    const persona = {
      ...profile,
      interests: JSON.parse(profile.interests),
      location: JSON.parse(profile.location),
      behavior_traits: JSON.parse(profile.behavior_traits)
    };

    try {
      const contextOptions: any = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        geolocation: { latitude: persona.location.lat, longitude: persona.location.lng },
        permissions: ['geolocation'],
        timezoneId: persona.location.timezone,
        locale: persona.location.locale
      };

      if (persona.proxy) {
        contextOptions.proxy = { server: persona.proxy };
      }

      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();
      
      // Human-like mouse movement simulation
      await page.mouse.move(100, 100);
      await page.goto(url, { waitUntil: 'networkidle' });

      // Initial screenshot
      const initialScreenshot = await page.screenshot({ type: 'jpeg', quality: 30 });
      db.prepare('UPDATE surveys SET last_screenshot = ? WHERE id = ?').run(initialScreenshot.toString('base64'), survey_id);

      let finished = false;
      while (!finished) {
        // Detect question types and interactive elements
        const pageContext = await page.evaluate(() => {
          const findQuestions = () => {
            const elements = document.querySelectorAll('div, section, form, fieldset');
            return Array.from(elements).map(el => {
              const htmlEl = el as HTMLElement;
              const text = htmlEl.innerText?.trim();
              
              // Find inputs within this element
              const inputs = Array.from(el.querySelectorAll('input, select, textarea, [role="radio"], [role="checkbox"]')).map(input => {
                const inputEl = input as HTMLElement;
                return {
                  type: inputEl.tagName.toLowerCase() === 'input' ? (inputEl as HTMLInputElement).type : inputEl.tagName.toLowerCase(),
                  id: inputEl.id,
                  name: (inputEl as any).name,
                  placeholder: (inputEl as any).placeholder,
                  value: (inputEl as any).value,
                  text: inputEl.innerText?.trim(),
                  selector: inputEl.id ? `#${inputEl.id}` : null // We'll try to find better selectors
                };
              });

              if (inputs.length > 0 && text && text.length < 1000) {
                return { text, inputs, html: el.innerHTML.substring(0, 2000) };
              }
              return null;
            }).filter(x => x !== null);
          };

          return {
            title: document.title,
            url: window.location.href,
            questions: findQuestions()
          };
        });

        if (pageContext.questions.length > 0) {
          // Create a task for the frontend brain
          const task_id = uuidv4();
          db.prepare(
            'INSERT INTO tasks (id, survey_id, type, payload) VALUES (?, ?, ?, ?)'
          ).run(task_id, survey_id, 'analyze_page', JSON.stringify({ ...pageContext, persona }));

          // Wait for result with timeout
          let result = null;
          let attempts = 0;
          const maxAttempts = 30; // 60 seconds timeout
          while (!result && attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000));
            const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id) as any;
            if (task.status === 'completed') {
              result = JSON.parse(task.result);
            }
            attempts++;
          }

          if (!result) {
            console.error(`Task ${task_id} timed out after 60s`);
            finished = true;
            break;
          }

          // Apply answers
          for (const action of result.actions) {
            try {
              // Random hesitation
              await new Promise(r => setTimeout(r, 500 + Math.random() * 2000 * persona.behavior_traits.hesitation));
              
              if (action.type === 'click') {
                await page.click(action.selector, { timeout: 5000 });
              } else if (action.type === 'type') {
                await page.fill(action.selector, action.value, { timeout: 5000 });
              } else if (action.type === 'select') {
                await page.selectOption(action.selector, action.value);
              }

              // Take screenshot after action
              const screenshot = await page.screenshot({ type: 'jpeg', quality: 30 });
              db.prepare('UPDATE surveys SET last_screenshot = ? WHERE id = ?').run(screenshot.toString('base64'), survey_id);
            } catch (actionErr) {
              console.warn(`Action failed: ${action.type} on ${action.selector}`, actionErr);
            }
          }

          // Click next/submit if found
          const nextButton = await page.$('button:has-text("Next"), button:has-text("Submit"), input[type="submit"]');
          if (nextButton) {
            await nextButton.click();
            await page.waitForLoadState('networkidle');
          } else {
            finished = true;
          }
        } else {
          finished = true;
        }

        // Check for completion or blocks
        if (await page.content().then(c => c.includes('Thank you') || c.includes('completed'))) {
          finished = true;
        }
      }

      db.prepare("UPDATE surveys SET status = 'completed', end_time = CURRENT_TIMESTAMP WHERE id = ?").run(survey_id);
    } catch (err) {
      console.error('Automation error:', err);
      db.prepare("UPDATE surveys SET status = 'failed', end_time = CURRENT_TIMESTAMP WHERE id = ?").run(survey_id);
    } finally {
      await browser.close();
      activeBrowsers.delete(survey_id);
    }
  }

  // --- End of API Routes ---

  if (process.env.NODE_ENV !== 'production') {
    console.log('Initializing Vite server...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server successfully running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
