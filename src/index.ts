import { Context, Schema, h } from 'koishi'
import {} from 'koishi-plugin-puppeteer'

export const name = 'nasiara-dict'

export interface Config {
  timeout: number
}

export const Config: Schema<Config> = Schema.object({
  timeout: Schema.number()
    .default(30000)
    .description('最长等待时间'),
})

export const inject = ['puppeteer']

export function apply(ctx: Context, config: Config) {
  ctx.command('nasiara查词 <word:text>', '双向查询 Nasiara 单词')
    .usage("注意：选项请写在最前面，不然会被当成单词的一部分！")
    .option("declension", "-d 查变格/变位")
    .action(async ({ session, options }, word) => {
      const url = `https://www.kouchya.top/xlang_super?search=${word}`

      const page = await ctx.puppeteer.page()
      try {
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: config.timeout
        })
      } catch (error) {
        const logger = ctx.logger("nasiara-dict")
        logger.warn(`页面加载超时：${error.stack}`)
        return '页面加载已超时'
      }

      if (options.declension) {
        if (word.split(" ").length > 1) {
          for (let i = 1; i < word.split(" ").length + 1; i++) {
            let children = await page.$eval(`#app > div.section.tac.xlang-sec > div.query-results > div:nth-child(${i}) > div:nth-child(2)`, (uiElement) => {
              return uiElement.children
            })

            if (Object.keys(children).length > 1) {
              for (let j = 1; j < Object.keys(children).length + 1; j++) {
                let element = await page.$(`#app > div.section.tac.xlang-sec > div.query-results > div:nth-child(${i}) > div:nth-child(2) > div:nth-child(${j}) > div.result-header > div`)
                await element.click()
              }
            } else {
              let element = await page.$(`#app > div.section.tac.xlang-sec > div.query-results > div:nth-child(${i}) > div:nth-child(2) > div > div.result-header > div.conjugate`)
              await element.click()
            }
          }
        } else {
          let children = await page.$eval(`#app > div.section.tac.xlang-sec > div.query-results > div > div:nth-child(2)`, (uiElement) => {
            return uiElement.children
          })

          if (Object.keys(children).length > 1) {
            for (let j = 1; j < Object.keys(children).length + 1; j++) {
              let element = await page.$(`#app > div.section.tac.xlang-sec > div.query-results > div > div:nth-child(2) > div:nth-child(${j}) > div.result-header > div`)
              await element.click()
            }
          } else {
            let element = await page.$(`#app > div.section.tac.xlang-sec > div.query-results > div > div:nth-child(2) > div > div.result-header > div`)
            await element.click()
          }
        }
      }

      const element = await page.$("#app > div.section.tac.xlang-sec > div.query-results")
      const buffer = Buffer.from(await element.screenshot())

      await page.close()

      return h.image(buffer, "image/png")
    })
}