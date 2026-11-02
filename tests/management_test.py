"""Manual entry, photo, reuse across sets and classic sheet regression journey."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import os
ROOT=Path(__file__).resolve().parents[1]
def action(p,name):return p.locator(f'[data-action="{name}"]:visible')
def submit(p,id):p.locator(f'#{id} button[type=submit]').click()
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 p=b.new_page(viewport={'width':1280,'height':1000});errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto('http://127.0.0.1:8765');action(p,'choose-mode').first.click();action(p,'new-set').first.click();p.locator('#set-form [name=name]').fill('Первый сет');submit(p,'set-form')
 action(p,'add-menu').click();action(p,'new-wine').click()
 for name,value in {'name':'Вино <Резерв> & 2020','number':'007','producer':'Винодельня','year':'2020','bottled':'2021-05-20','shop':'Магазин','price':'1234.56','notes':'Карточка покупного вина'}.items():p.locator(f'#wine-form [name={name}]').fill(value)
 p.locator('[data-action=form-photo][data-id=gallery]').click();p.locator('#web-file').set_input_files(str(ROOT/'app/src/main/res/drawable/tv_banner.png'))
 expect(p.locator('#photo-state')).to_have_text('Фото добавлено');submit(p,'wine-form')
 action(p,'wine').first.click();expect(p.locator('.wine-photo img')).to_be_visible();expect(p.locator('.wine-facts')).to_contain_text('1 234,56'.replace(' ','\xa0'))
 action(p,'edit-wine').click();p.locator('#wine-form [name=shop]').fill('Другой магазин');submit(p,'wine-form');expect(p.locator('.wine-facts')).to_contain_text('Другой магазин')
 p.locator('.nav-item[data-id=sets]:visible').first.click();action(p,'new-set').first.click();p.locator('#set-form [name=name]').fill('Второй сет');submit(p,'set-form')
 action(p,'add-menu').click();action(p,'existing-wines').click();p.locator('#existing-form input[type=checkbox]').check();submit(p,'existing-form')
 expect(p.locator('.wine-row')).to_have_count(1)
 action(p,'edit-set').click();p.locator('#set-form input[name^="sample-"]').fill('A-17');submit(p,'set-form');expect(p.locator('.sample-number b')).to_have_text('A-17')
 action(p,'rate-wine').click();p.locator('#start-form [name=schema]').select_option('classic-still');p.locator('#start-form [name=blind]').select_option('false');p.locator('#start-form [name=date]').fill('2024-11-02');submit(p,'start-form')
 expect(p.locator('.sheet-head h1')).to_have_text('Вино <Резерв> & 2020')
 for group in p.locator('.point-options').all():group.locator('button').first.click()
 action(p,'submit-rating').first.click();expect(p.locator('.saved-score')).to_contain_text('100');action(p,'close').first.click();action(p,'wine').first.click();expect(p.locator('.membership button')).to_have_count(2)
 p.locator('.nav-item[data-id=catalogue]:visible').first.click();expect(p.locator('.wine-row')).to_have_count(1)
 assert not errors,errors
 print('PASS: manual retail fields; gallery photo; escaping; card edits; reuse without duplicate wine; editable sample numbers; classic 100-point sheet; backdated open tasting; shared history.')
 b.close()
