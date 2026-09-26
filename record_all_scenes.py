import asyncio
import json
import os
import shutil
import sys
from playwright.async_api import async_playwright

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

APP_URL = "http://localhost:3000"

async def record_scene(p, scene_meta):
    sid = scene_meta["id"]
    title = scene_meta["title"]
    duration = scene_meta["duration"]
    output_dir = f"video_production/raw_clips/scene_{sid}"
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"\n=======================================================")
    print(f"RECORDING SCENE {sid}: {title} (Target: {duration:.2f}s)")
    print(f"=======================================================")
    
    browser = await p.chromium.launch(
        headless=True,
        args=[
            "--disable-infobars",
            "--no-default-browser-check",
            "--window-size=1920,1080",
            "--start-maximized"
        ]
    )
    
    context = await browser.new_context(
        viewport={"width": 1920, "height": 1080},
        record_video_dir=output_dir,
        record_video_size={"width": 1920, "height": 1080}
    )
    
    page = await context.new_page()
    start_time = asyncio.get_event_loop().time()
    
    # -------------------------------------------------------------
    # SCENE SPECIFIC AUTOMATION
    # -------------------------------------------------------------
    if sid == 1:
        # Scene 1: The Problem — Splash & Welcome
        # Ensure splash is shown first
        await page.add_init_script("localStorage.removeItem('ner_mind_splash_seen');")
        await page.goto(APP_URL, wait_until="networkidle")
        await page.wait_for_timeout(4000)
        
        # Click Get Started
        btn = page.locator("button.accessible-btn-primary")
        if await btn.count() > 0:
            await btn.click()
            await page.wait_for_timeout(2000)
            
        # Gently scroll home dashboard
        await page.evaluate("window.scrollBy({ top: 350, behavior: 'smooth' });")
        await page.wait_for_timeout(4000)
        await page.evaluate("window.scrollBy({ top: -350, behavior: 'smooth' });")

    elif sid == 2:
        # Scene 2: Introducing NER-MIND — Patient Dashboard & USP Loop
        await page.add_init_script("localStorage.setItem('ner_mind_splash_seen', 'true');")
        await page.goto(APP_URL, wait_until="networkidle")
        await page.wait_for_timeout(3000)
        
        # Click Plan tab
        plan_tab = page.locator("button:has-text('Plan'), button:has-text('Today')")
        if await plan_tab.count() > 0:
            await plan_tab.first.click()
            await page.wait_for_timeout(5000)
            
        # Return to Home tab
        home_tab = page.locator("button:has-text('Home')")
        if await home_tab.count() > 0:
            await home_tab.first.click()
            await page.wait_for_timeout(3000)
            
        await page.evaluate("window.scrollBy({ top: 300, behavior: 'smooth' });")

    elif sid == 3:
        # Scene 3: Caregiver Configuration — Caregiver Portal & Profile
        await page.add_init_script("localStorage.setItem('ner_mind_splash_seen', 'true');")
        await page.goto(APP_URL, wait_until="networkidle")
        await page.wait_for_timeout(1500)
        
        # Click Caregiver button
        cg_btn = page.locator("button:has-text('Caregiver')")
        if await cg_btn.count() > 0:
            await cg_btn.first.click()
            await page.wait_for_timeout(1500)
            
        # Fill login if present
        user_input = page.locator("input[type='text']")
        pass_input = page.locator("input[type='password']")
        if await user_input.count() > 0:
            await user_input.fill("caregiver_pranjal")
            await pass_input.fill("CaregiverSecurePass123!")
            await page.locator("button[type='submit']").click()
            await page.wait_for_timeout(2000)
            
        # Navigate to Language & Voice Settings
        lang_nav = page.locator("button:has-text('Language & Voice Settings'), button:has-text('Profile')")
        if await lang_nav.count() > 0:
            await lang_nav.first.click()
            await page.wait_for_timeout(3000)
            await page.evaluate("window.scrollBy({ top: 250, behavior: 'smooth' });")

    elif sid == 4:
        # Scene 4: Six Cognitive Domains — Entering Games & Multi-question Flow
        await page.add_init_script("localStorage.setItem('ner_mind_splash_seen', 'true');")
        await page.goto(APP_URL, wait_until="networkidle")
        await page.wait_for_timeout(1500)
        
        # Click Games tab
        games_tab = page.locator("button:has-text('Games')")
        if await games_tab.count() > 0:
            await games_tab.first.click()
            await page.wait_for_timeout(3000)
            
        # Launch Memory Game
        mem_card = page.locator("text='Market Shopping Recall', text='Memory'").first
        if await mem_card.count() > 0:
            await mem_card.click()
            await page.wait_for_timeout(4000)
            
            # Click Start Recall (Question 1)
            recall_btn = page.locator("button:has-text('Start Recall'), button:has-text('Recall')")
            if await recall_btn.count() > 0:
                await recall_btn.first.click()
                await page.wait_for_timeout(1500)
                
                # Select first 2 candidates
                candidates = page.locator("button:has-text('₹'), button:has-text('Add'), div[role='button']")
                cnt = await candidates.count()
                if cnt >= 2:
                    await candidates.nth(0).click()
                    await page.wait_for_timeout(800)
                    await candidates.nth(1).click()
                    await page.wait_for_timeout(800)
                    
                # Submit Recall
                submit_btn = page.locator("button:has-text('Submit Recall'), button:has-text('Check')")
                if await submit_btn.count() > 0:
                    await submit_btn.first.click()
                    await page.wait_for_timeout(3500) # Feedback displays and Q2 auto-loads!

    elif sid == 5:
        # Scene 5: Adaptive Difficulty — Easy -> Medium -> Difficult complexity
        await page.add_init_script("localStorage.setItem('ner_mind_splash_seen', 'true');")
        await page.goto(APP_URL, wait_until="networkidle")
        await page.wait_for_timeout(1500)
        
        # Open Cognitive Games menu
        games_tab = page.locator("button:has-text('Games')")
        if await games_tab.count() > 0:
            await games_tab.first.click()
            await page.wait_for_timeout(2000)
            
        # Launch Attention Craft Pattern
        att_card = page.locator("text='Attention', text='Craft Pattern'").first
        if await att_card.count() > 0:
            await att_card.click()
            await page.wait_for_timeout(3000)
            
            # Show Level & Complexity badges
            await page.wait_for_timeout(2000)
            
            # Answer question
            choice = page.locator("button:has-text('Pattern'), button.accessible-btn").first
            if await choice.count() > 0:
                await choice.click()
                await page.wait_for_timeout(3000)

    elif sid == 6:
        # Scene 6: Continual Personalization — Bayesian Beliefs & Stats
        await page.add_init_script("localStorage.setItem('ner_mind_splash_seen', 'true');")
        await page.goto(APP_URL, wait_until="networkidle")
        await page.wait_for_timeout(1500)
        
        # Click Progress tab
        prog_tab = page.locator("button:has-text('Progress')")
        if await prog_tab.count() > 0:
            await prog_tab.first.click()
            await page.wait_for_timeout(3000)
            
            # Scroll through Bayesian domain cards and adaptation history
            await page.evaluate("window.scrollBy({ top: 350, behavior: 'smooth' });")
            await page.wait_for_timeout(4000)
            await page.evaluate("window.scrollBy({ top: 350, behavior: 'smooth' });")
            await page.wait_for_timeout(4000)

    elif sid == 7:
        # Scene 7: Real-Life Transfer — 4-Stage Protocol
        await page.add_init_script("localStorage.setItem('ner_mind_splash_seen', 'true');")
        await page.goto(APP_URL, wait_until="networkidle")
        await page.wait_for_timeout(1500)
        
        # Open Missions tab
        mission_tab = page.locator("button:has-text('Plan'), button:has-text('Home')")
        # Scroll to Real-Life Transfer card on home
        await page.evaluate("window.scrollBy({ top: 400, behavior: 'smooth' });")
        await page.wait_for_timeout(2000)
        
        transfer_card = page.locator("text='Real-Life Transfer Protocol', text='Morning Tea'").first
        if await transfer_card.count() > 0:
            await transfer_card.click()
            await page.wait_for_timeout(4000)
            
        await page.evaluate("window.scrollBy({ top: 300, behavior: 'smooth' });")

    elif sid == 8:
        # Scene 8: Offline-First Operation — Disconnection & Local Execution
        await page.add_init_script("localStorage.setItem('ner_mind_splash_seen', 'true');")
        await page.goto(APP_URL, wait_until="networkidle")
        await page.wait_for_timeout(2000)
        
        # Simulate Network Disconnection (Genuine browser offline mode)
        print("  -> Setting browser to OFFLINE mode...")
        await context.set_offline(True)
        await page.wait_for_timeout(3000)
        
        # Click Games tab while offline
        games_tab = page.locator("button:has-text('Games')")
        if await games_tab.count() > 0:
            await games_tab.first.click()
            await page.wait_for_timeout(3000)
            
        # Click Progress tab while offline
        prog_tab = page.locator("button:has-text('Progress')")
        if await prog_tab.count() > 0:
            await prog_tab.first.click()
            await page.wait_for_timeout(3000)
            
        # Re-enable online at end of scene
        await context.set_offline(False)

    elif sid == 9:
        # Scene 9: Multilingual System — Caregiver Language Control (Hindi & Kannada)
        await page.add_init_script("localStorage.setItem('ner_mind_splash_seen', 'true');")
        await page.goto(APP_URL, wait_until="networkidle")
        await page.wait_for_timeout(1500)
        
        # Go to Caregiver Portal
        cg_btn = page.locator("button:has-text('Caregiver')")
        if await cg_btn.count() > 0:
            await cg_btn.first.click()
            await page.wait_for_timeout(1500)
            
        # Login if needed
        user_input = page.locator("input[type='text']")
        if await user_input.count() > 0:
            await user_input.fill("caregiver_pranjal")
            await page.locator("input[type='password']").fill("CaregiverSecurePass123!")
            await page.locator("button[type='submit']").click()
            await page.wait_for_timeout(2000)
            
        # Navigate to Language & Voice Settings
        lang_nav = page.locator("button:has-text('Language & Voice Settings'), button:has-text('Profile')")
        if await lang_nav.count() > 0:
            await lang_nav.first.click()
            await page.wait_for_timeout(2500)
            
        # Click Hindi card
        hi_card = page.locator("button:has-text('Hindi'), div:has-text('हिन्दी')").first
        if await hi_card.count() > 0:
            await hi_card.click()
            await page.wait_for_timeout(2000)
            
        # Scroll down to Voice Pack Manager Table
        await page.evaluate("window.scrollBy({ top: 380, behavior: 'smooth' });")
        await page.wait_for_timeout(3000)
        
        # Switch back to English
        en_card = page.locator("button:has-text('English')").first
        if await en_card.count() > 0:
            await en_card.click()
            await page.wait_for_timeout(1500)

    elif sid == 10:
        # Scene 10: Family Memory — Photos & Personal Context
        await page.add_init_script("localStorage.setItem('ner_mind_splash_seen', 'true');")
        await page.goto(APP_URL, wait_until="networkidle")
        await page.wait_for_timeout(1500)
        
        # Click Home -> Family Memories
        fam_btn = page.locator("text='Family', text='Granddaughter'").first
        if await fam_btn.count() == 0:
            # Click bottom nav or dashboard button
            fam_btn = page.locator("button:has-text('Family'), text='Family Memories'").first
        if await fam_btn.count() > 0:
            await fam_btn.click()
            await page.wait_for_timeout(3000)
            
        await page.evaluate("window.scrollBy({ top: 250, behavior: 'smooth' });")
        await page.wait_for_timeout(3000)

    elif sid == 11:
        # Scene 11: Caregiver Monitoring — Trends, Observational Curves & Alerts
        await page.add_init_script("localStorage.setItem('ner_mind_splash_seen', 'true');")
        await page.goto(APP_URL, wait_until="networkidle")
        await page.wait_for_timeout(1500)
        
        # Go to Caregiver Portal
        cg_btn = page.locator("button:has-text('Caregiver')")
        if await cg_btn.count() > 0:
            await cg_btn.first.click()
            await page.wait_for_timeout(1500)
            
        user_input = page.locator("input[type='text']")
        if await user_input.count() > 0:
            await user_input.fill("caregiver_pranjal")
            await page.locator("input[type='password']").fill("CaregiverSecurePass123!")
            await page.locator("button[type='submit']").click()
            await page.wait_for_timeout(2000)
            
        # Show Dashboard Overview
        await page.wait_for_timeout(2500)
        await page.evaluate("window.scrollBy({ top: 350, behavior: 'smooth' });")
        await page.wait_for_timeout(3000)
        
        # Click Alerts tab
        alerts_tab = page.locator("button:has-text('Alerts')")
        if await alerts_tab.count() > 0:
            await alerts_tab.first.click()
            await page.wait_for_timeout(3000)

    elif sid == 12:
        # Scene 12: Final System Loop — REAL LIFE -> OBSERVE -> PERSONALIZE -> TRAIN -> VERIFY -> ADAPT
        await page.add_init_script("localStorage.setItem('ner_mind_splash_seen', 'true');")
        await page.goto(APP_URL, wait_until="networkidle")
        await page.wait_for_timeout(2000)
        
        # Show the Home Dashboard Top Banner with Closed Loop
        await page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' });")
        await page.wait_for_timeout(4000)
        await page.evaluate("window.scrollBy({ top: 220, behavior: 'smooth' });")
        await page.wait_for_timeout(4000)

    elif sid == 13:
        # Scene 13: Final Closing — Mission & Branding
        await page.add_init_script("localStorage.setItem('ner_mind_splash_seen', 'true');")
        await page.goto(APP_URL, wait_until="networkidle")
        await page.wait_for_timeout(2500)
        
        # Show clean top view of companion
        await page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' });")
        await page.wait_for_timeout(6000)
        await page.evaluate("window.scrollBy({ top: 320, behavior: 'smooth' });")
        await page.wait_for_timeout(6000)
        await page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' });")

    # -------------------------------------------------------------
    # HOLD REMAINING TIME TO EXACT SCENE DURATION
    # -------------------------------------------------------------
    elapsed = asyncio.get_event_loop().time() - start_time
    remaining = max(0.5, duration - elapsed + 0.5)
    print(f"  Action completed in {elapsed:.2f}s. Holding for {remaining:.2f}s to match audio length...")
    await page.wait_for_timeout(int(remaining * 1000))
    
    await context.close()
    await browser.close()
    
    # Locate generated video file in output_dir
    files = [f for f in os.listdir(output_dir) if f.endswith(".webm")]
    if files:
        src = os.path.join(output_dir, files[0])
        dst = f"video_production/raw_clips/clip_{sid}.webm"
        shutil.move(src, dst)
        print(f"  ✓ Saved raw recording: {dst}")
    else:
        print(f"  ⚠️ Warning: No video found in {output_dir}")

async def main():
    os.makedirs("video_production/raw_clips", exist_ok=True)
    with open("video_production/scenes_metadata.json", "r", encoding="utf-8") as f:
        scenes = json.load(f)
        
    async with async_playwright() as p:
        for s in scenes:
            await record_scene(p, s)
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())
