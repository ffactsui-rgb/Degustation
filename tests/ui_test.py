"""User journeys against the exact bundled Android UI (requires Python Playwright)."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json, os
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'work'/'screenshots'
ART.mkdir(parents=True,exist_ok=True)
CSV='number;name;producer;year;price\n1;Рислинг Резерв;Дом у реки;2020;1800\n2;Рислинг Резерв;Дом у реки;2022;1600\n3;Шардоне;Южный склон;2021;1500'
def action(p,name):return p.locator(f'[data-action="{name}"]:visible')
def nav(p,name):p.locator(f'.nav-item[data-id="{name}"]:visible').first.click()
def form_submit(p,id):p.locator(f'#{id} button[type=submit]').click()
def fill_scores(p,level=0):
    for group in p.locator('.point-options').all():group.locator('button').nth(level).click()
def start(p,level=0,comment=''):
    action(p,'rate-wine').first.click();form_submit(p,'start-form')
    expect(p.locator('.sheet-head h1')).to_have_text('Образец № 1')
    assert 'Рислинг' not in p.locator('main').inner_text()
    fill_scores(p,level)
    p.locator('[name=comment]').fill(comment)
    action(p,'submit-rating').first.click()
    expect(p.locator('.saved-score')).to_contain_text('100' if level==0 else '88')
    action(p,'close').first.click()
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    ctx=b.new_context(viewport={'width':1440,'height':1050},accept_downloads=True)
    p=ctx.new_page();errors=[]
    p.on('pageerror',lambda e:errors.append(str(e)))
    p.goto('http://127.0.0.1:8765')
    action(p,'choose-mode').first.click();action(p,'new-set').first.click()
    p.locator('#set-form [name=name]').fill('Вертикальная дегустация')
    p.locator('#set-form [name=description]').fill('Рислинги разных лет')
    form_submit(p,'set-form')
    action(p,'add-menu').click();action(p,'import-csv').click()
    p.locator('#web-file').set_input_files({'name':'wines.csv','mimeType':'text/csv','buffer':CSV.encode()})
    expect(action(p,'apply-import')).to_be_visible();action(p,'apply-import').click()
    expect(p.locator('.wine-row')).to_have_count(3)
    start(p,0,'Цитрус, свежесть и долгое послевкусие.')
    # A partially completed second sheet must survive reload without becoming a submitted rating.
    action(p,'rate-wine').first.click();form_submit(p,'start-form');p.locator('.point-options').first.locator('button').nth(1).click()
    p.locator('[name=comment]').fill('Черновик комментария');action(p,'back').first.click();action(p,'confirm').click()
    p.reload();action(p,'set').first.click();action(p,'rate-wine').first.click();form_submit(p,'start-form')
    expect(p.locator('[name=comment]')).to_have_value('Черновик комментария')
    expect(p.locator('.picked')).to_have_count(1)
    fill_scores(p,1);action(p,'submit-rating').first.click();expect(p.locator('.saved-score')).to_contain_text('88');action(p,'close').first.click()
    # User profiles and the frozen group session.
    nav(p,'people');action(p,'new-user').click();p.locator('#user-form [name=name]').fill('Анна');form_submit(p,'user-form')
    action(p,'mode').click();p.locator('[data-action=choose-mode][data-id=group]').click()
    action(p,'set').first.click();action(p,'start').first.click();form_submit(p,'session-form');form_submit(p,'start-form')
    fill_scores(p,0);action(p,'submit-rating').first.click();action(p,'close').first.click()
    action(p,'rate-wine').first.click();p.locator('#start-form [name=userId]').select_option(label='Анна');form_submit(p,'start-form');fill_scores(p,1);action(p,'submit-rating').first.click();action(p,'close').first.click()
    action(p,'results').first.click();expect(p.locator('.winner strong').first).to_contain_text('94')
    expect(p.locator('.session-progress')).to_contain_text('Анна')
    p.screenshot(path=str(ART/'results-desktop.png'),full_page=True)
    action(p,'export-menu').first.click()
    with p.expect_download() as dl:action(p,'export-ratings').click()
    download=dl.value;download.save_as(str(ROOT/'work'/'export-test.csv'))
    exported=(ROOT/'work'/'export-test.csv').read_text(encoding='utf-8-sig')
    assert 'Анна' in exported and 'total' in exported
    action(p,'close').first.click()
    nav(p,'catalogue');action(p,'wine').first.click()
    expect(p.locator('.wine-facts')).to_contain_text('100');expect(p.locator('.wine-facts')).to_contain_text('88')
    expect(p.locator('.history-row')).to_have_count(4)
    nav(p,'compare');expect(p.locator('tbody tr')).to_have_count(6) # two vintages plus four evaluations
    # Backup and preview captures.
    nav(p,'sets');p.screenshot(path=str(ART/'home-desktop.png'),full_page=True)
    nav(p,'settings')
    with p.expect_download() as dl:action(p,'backup').click()
    dl.value.save_as(str(ROOT/'work'/'backup-test.json'));backup=json.loads((ROOT/'work'/'backup-test.json').read_text())
    assert len(backup['ratings'])==4 and len(backup['sessions'])==1
    # Equal validation in restoration, then confirm replacement.
    action(p,'restore').click();p.locator('#web-file').set_input_files(str(ROOT/'work'/'backup-test.json'));action(p,'confirm').click();expect(p.locator('h1')).to_have_text('Мои сеты')
    # Narrow device, blind sheet, and navigation by remote control.
    p.set_viewport_size({'width':390,'height':844});p.screenshot(path=str(ART/'home-phone.png'),full_page=True)
    action(p,'set').first.click();action(p,'rate-wine').first.click();form_submit(p,'start-form')
    p.screenshot(path=str(ART/'sheet-phone.png'),full_page=True)
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
    p.set_viewport_size({'width':1920,'height':1080});p.evaluate("document.body.classList.add('tv');App.remote('DOWN');App.remote('RIGHT');App.remote('DOWN')")
    assert p.evaluate('document.activeElement.tagName')!='BODY'
    p.screenshot(path=str(ART/'sheet-tv.png'),full_page=True)
    assert not errors,errors
    print('PASS: CSV import; solo and repeated scores; persisted draft; group session; two jurors; results; CSV export; wine history; comparison; JSON backup/restore; phone layout; TV focus. No browser errors.')
    b.close()
