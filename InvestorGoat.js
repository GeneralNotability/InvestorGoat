// InvestorGoat, a suite of CheckUser tools.
// Parts taken from https://en.wikipedia.org/wiki/User:Firefly/checkuseragenthelper.js
/* global mw, $ */

const InvestorGoatUAMap = new Map()
let InvestorGoatCompareTarget = null
$(async function ($) {
  if (mw.config.get('wgPageName') === 'Special:CheckUser') {
    await mw.loader.getScript('https://en.wikipedia.org/w/index.php?title=User:GeneralNotability/ua-parser.min.js&action=raw&ctype=text/javascript')
    $('.mw-checkuser-agent').each(async function () {
      const $el = $(this)
      const ua = $el.text()
      const parser = new UAParser()
      if (!InvestorGoatUAMap.has(ua)) {
        parser.setUA(ua)
        const uaObj = parser.getResult()
        InvestorGoatUAMap.set(ua, uaObj)
      }
      // Add indicators
      $('<span>').addClass('InvestorGoat-device').text('DEV').css({ margin: '2px' }).appendTo($el.parent())
      $('<span>').addClass('InvestorGoat-OS').text('OS').css({ margin: '2px' }).appendTo($el.parent())
      $('<span>').addClass('InvestorGoat-browser').text('BR').css({ margin: '2px' }).appendTo($el.parent())

      // Set up dummy link
      const $link = $('<a>').attr('href', '#').on('click', InvestorGoatUAClicked)
      $link.insertAfter($el)
      $el.detach()
      $link.append($el)
    })
  }
})

async function InvestorGoatUAClicked (event) {
  console.log(event)
  InvestorGoatCompareTarget = InvestorGoatUAMap.get($(event.target).text())
  InvestorGoatUpdateUAColors()
  event.preventDefault()
}

async function InvestorGoatUpdateUAColors () {
  const match = { backgroundColor: 'DarkGreen', color: 'white' }
  const familyMismatch = { backgroundColor: 'DarkRed', color: 'white' }
  const majorVersionSelectedBehind = { backgroundColor: 'purple', color: 'white' }
  const majorVersionSelectedAhead = { backgroundColor: 'orange', color: 'black' }
  const minorVersionSelectedBehind = { backgroundColor: 'DarkBlue', color: 'white' }
  const minorVersionSelectedAhead = { backgroundColor: 'Yellow', color: 'black' }
  const patchVersionSelectedBehind = { backgroundColor: 'Turquoise', color: 'white' }
  const patchVersionSelectedAhead = { backgroundColor: 'YellowGreen', color: 'black' }

  $('.mw-checkuser-agent').each(async function () {
    const $el = $(this)
    const uaObj = InvestorGoatUAMap.get($el.text())
    console.log(InvestorGoatCompareTarget)
    console.log(uaObj)

    const $devEl = $el.parent().parent().children('.InvestorGoat-device')
    if (uaObj.device.type !== InvestorGoatCompareTarget.device.type) {
      $devEl.css(familyMismatch).attr('title', `Device type mismatch, this is ${uaObj.device.type}, selected is ${InvestorGoatCompareTarget.device.type}`)
    } else if (uaObj.device.vendor !== InvestorGoatCompareTarget.device.vendor) {
      $devEl.css(majorVersionSelectedAhead).attr('title', `Device vendor mismatch, this is ${uaObj.device.vendor}, selected is ${InvestorGoatCompareTarget.device.vendor}`)
    } else if (uaObj.device.version !== InvestorGoatCompareTarget.device.version) {
      $devEl.css(majorVersionSelectedAhead).attr('title', `Device version mismatch, this is ${uaObj.device.version}, selected is ${InvestorGoatCompareTarget.device.version}`)
    } else {
      $devEl.css(match).attr('title', 'Devices match')
    }

    const $osEl = $el.parent().parent().children('.InvestorGoat-OS')
    if (uaObj.os.name !== InvestorGoatCompareTarget.os.name) {
      $osEl.css(familyMismatch).attr('title', `OS mismatch, selected is ${InvestorGoatCompareTarget.os.name}`)
    } else if (uaObj.os.version !== InvestorGoatCompareTarget.os.version) {
      $osEl.css(majorVersionSelectedAhead).attr('title', `OS version mismatch, selected is ${InvestorGoatCompareTarget.os.version}`)
    } else {
      $osEl.css(match).attr('title', 'OSes match')
    }

    const $browserEl = $el.parent().parent().children('.InvestorGoat-browser')
    if (uaObj.browser.name !== InvestorGoatCompareTarget.browser.name) {
      $browserEl.css(familyMismatch).attr('title', `Browser mismatch, selected is ${InvestorGoatCompareTarget.browser.name}`)
    } else if (uaObj.browser.version !== InvestorGoatCompareTarget.browser.version) {
      $browserEl.css(majorVersionSelectedAhead).attr('title', `Browser version mismatch, selected is ${InvestorGoatCompareTarget.browser.version}`)
    } else {
      $browserEl.css(match).attr('title', 'Browsers match')
    }
  })
}
