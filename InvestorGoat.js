// <nowiki>
// InvestorGoat, a suite of CheckUser tools.
// Parts taken from https://en.wikipedia.org/wiki/User:Firefly/checkuseragenthelper.js
/* global mw, $, UAParser */

$(async function ($) {
  if (mw.config.get('wgCanonicalSpecialPageName') && mw.config.get('wgCanonicalSpecialPageName').startsWith('CheckUser')) {
    await mw.loader.using('mediawiki.util')
    InvestorGoatPrepUAs()
    mw.hook('wikipage.content').add(InvestorGoatIPHook)
    mw.hook('wikipage.content').add(InvestorGoatAddQuickReasonBoxHook)
  }
  mw.hook('wikipage.content').add(InvestorGoatHighlightLogs)
})

const InvestorGoatwmbApiKey = mw.user.options.get('userjs-wmbkey')
const InvestorGoatUAMap = new Map()
let InvestorGoatCompareTarget = null

async function InvestorGoatPrepUAs () {
  await mw.loader.getScript('https://en.wikipedia.org/w/index.php?title=User:GeneralNotability/ua-parser.min.js&action=raw&ctype=text/javascript')
  $('.mw-checkuser-agent').each(async function () {
    const $el = $(this)
    const ua = $el.text()

    // Add indicators
    $('<span>').addClass('InvestorGoat-device').text('DEV').css({ margin: '2px', 'user-select': 'none' }).appendTo($el.parent())
    $('<span>').addClass('InvestorGoat-OS').text('OS').css({ margin: '2px', 'user-select': 'none' }).appendTo($el.parent())
    $('<span>').addClass('InvestorGoat-browser').text('BR').css({ margin: '2px', 'user-select': 'none' }).appendTo($el.parent())
    if (InvestorGoatwmbApiKey) {
      if (!InvestorGoatUAMap.has(ua)) {
        InvestorGoatUAMap.set(ua, null)
      }
    } else {
      const parser = new UAParser()
      if (!InvestorGoatUAMap.has(ua)) {
        parser.setUA(ua)
        const uaObj = parser.getResult()
        InvestorGoatUAMap.set(ua, uaObj)
      }
    }

    // Set up dummy link
    const $link = $('<a>').attr('href', '#').on('click', InvestorGoatUAClicked)
    $link.insertAfter($el)
    $el.detach()
    $link.append($el)
  })

  if (InvestorGoatwmbApiKey && InvestorGoatUAMap.size > 0) {
    // Do a batch query if we're using the WhatIsMyBrowser API
    const query = {}
    query.user_agents = {}
    query.parse_options = {
      return_metadata_for_useragent: true
    }
    for (const [key, _] of InvestorGoatUAMap.entries()) {
      query.user_agents[key] = key
    }
    const result = await $.ajax({
      type: 'post',
      url: 'https://api.whatismybrowser.com/api/v2/user_agent_parse_batch',
      data: JSON.stringify(query),
      headers: {
        'x-api-key': InvestorGoatwmbApiKey
      }
    })
    console.log(result)
    for (const [key, value] of Object.entries(result.parses)) {
      InvestorGoatUAMap.set(key, value)
    }

    // Flag interesting results
    $('.mw-checkuser-agent').each(async function () {
      const $el = $(this)
      const ua = $el.text()
      const val = InvestorGoatUAMap.get(ua)
      // Add indicators
      $('<span>').addClass('InvestorGoat-seen').text('#️⃣').css({ margin: '2px', 'user-select': 'none' })
        .attr('title', `Estimated popularity: ${Math.pow(10, Math.floor(Math.log10(val.user_agent_metadata.times_seen))).toLocaleString()}s`).appendTo($el.parent().parent())
      if (val.parse.is_weird) {
        $('<span>').addClass('InvestorGoat-weird').text('❓').css({ margin: '2px', 'user-select': 'none' })
          .attr('title', `UA flagged as weird: ${val.parse.is_weird_reason_code}`).appendTo($el.parent().parent())
      }
      if (val.parse.is_abusive) {
        $('<span>').addClass('InvestorGoat-abusive').text('‼️').css({ margin: '2px', 'user-select': 'none' })
          .attr('title', 'UA flagged as abusive').appendTo($el.parent().parent())
      }
      if (val.parse.is_spam) {
        $('<span>').addClass('InvestorGoat-spam').text('🥫').css({ margin: '2px', 'user-select': 'none' })
          .attr('title', 'UA flagged as spam').appendTo($el.parent().parent())
      }
      if (val.parse.is_restricted) {
        $('<span>').addClass('InvestorGoat-restricted').text('🛑').css({ margin: '2px', 'user-select': 'none' })
          .attr('title', 'UA flagged as restricted').appendTo($el.parent().parent())
      }
      if (val.parse.software_type === 'bot') {
        $('<span>').addClass('InvestorGoat-bot').text('🤖').css({ margin: '2px', 'user-select': 'none' })
          .attr('title', `UA flagged as bot: ${val.parse.software_sub_type}`).appendTo($el.parent().parent())
      }
    })
  }
}

async function InvestorGoatUAClicked (event) {
  InvestorGoatCompareTarget = InvestorGoatUAMap.get($(event.target).text())
  if (InvestorGoatwmbApiKey) {
    InvestorGoatUpdateUAColorsWmb()
  } else {
    InvestorGoatUpdateUAColors()
  }
  event.preventDefault()
}

async function InvestorGoatUpdateUAColors () {
  const match = { backgroundColor: 'DarkGreen', color: 'white' }
  const familyMismatch = { backgroundColor: 'DarkRed', color: 'white' }
  const majorVersionSelectedAhead = { backgroundColor: 'orange', color: 'black' }

  $('.mw-checkuser-agent').each(async function () {
    const $el = $(this)
    const uaObj = InvestorGoatUAMap.get($el.text())

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

async function InvestorGoatUpdateUAColorsWmb () {
  const match = { backgroundColor: 'DarkGreen', color: 'white' }
  const totalMismatch = { backgroundColor: 'DarkRed', color: 'white' }
  const majorMismatch = { backgroundColor: 'orange', color: 'black' }
  const minorMismatch = { backgroundColor: 'Yellow', color: 'black' }

  const versionSelectedBehind = { backgroundColor: 'DarkBlue', color: 'white' }
  const versionSelectedAhead = { backgroundColor: 'Yellow', color: 'black' }

  $('.mw-checkuser-agent').each(async function () {
    const $el = $(this)
    const uaObj = InvestorGoatUAMap.get($el.text())

    const $devEl = $el.parent().parent().children('.InvestorGoat-device')
    if (uaObj.parse.hardware_type !== InvestorGoatCompareTarget.parse.hardware_type) {
      $devEl.css(totalMismatch).attr('title', `Device type mismatch, this is "${uaObj.parse.hardware_type}", selected is "${InvestorGoatCompareTarget.parse.hardware_type}"`)
    } else if (uaObj.parse.hardware_sub_type !== InvestorGoatCompareTarget.parse.hardware_sub_type) {
      $devEl.css(majorMismatch).attr('title', `Device subtype mismatch, this is "${uaObj.parse.hardware_sub_type}", selected is "${InvestorGoatCompareTarget.parse.hardware_sub_type}"`)
    } else if (uaObj.parse.hardware_sub_sub_type !== InvestorGoatCompareTarget.parse.hardware_sub_sub_type) {
      $devEl.css(minorMismatch).attr('title', `Device sub-subtype mismatch, this is "${uaObj.parse.hardware_sub_sub_type}", selected is "${InvestorGoatCompareTarget.parse.hardware_sub_sub_type}"`)
    } else if (uaObj.parse.simple_operating_platform_string !== InvestorGoatCompareTarget.parse.simple_operating_platform_string) {
      $devEl.css(totalMismatch).attr('title', `Platform mismatch, this is "${uaObj.parse.simple_operating_platform_string}", selected is "${InvestorGoatCompareTarget.parse.simple_operating_platform_string}"`)
    } else {
      $devEl.css(match).attr('title', 'Devices match')
    }

    const $osEl = $el.parent().parent().children('.InvestorGoat-OS')
    if (uaObj.parse.operating_system_name_code !== InvestorGoatCompareTarget.parse.operating_system_name_code) {
      $osEl.css(totalMismatch).attr('title', `OS mismatch, this is "${uaObj.parse.operating_system_name}", selected is ${InvestorGoatCompareTarget.parse.operating_system_name}`)
    } else if (uaObj.parse.operating_system_flavour_code !== InvestorGoatCompareTarget.parse.operating_system_flavour_code) {
      $osEl.css(majorMismatch).attr('title', `OS flavor mismatch, this is "${uaObj.parse.operating_system_flavour}", selected is ${InvestorGoatCompareTarget.parse.operating_system_flavour}`)
    } else {
      let mismatch = false
      for (let i = 0; i < uaObj.parse.operating_system_version_full.length; i++) {
        if (i >= InvestorGoatCompareTarget.parse.operating_system_version_full.length) {
          break
        }
        if (parseInt(uaObj.parse.operating_system_version_full[i]) < parseInt(InvestorGoatCompareTarget.parse.operating_system_version_full[i])) {
          $osEl.css(versionSelectedAhead).attr('title', 'OS version mismatch, selected version is newer than this')
          mismatch = true
          break
        } else if (parseInt(uaObj.parse.operating_system_version_full[i]) > parseInt(InvestorGoatCompareTarget.parse.operating_system_version_full[i])) {
          $osEl.css(versionSelectedBehind).attr('title', 'OS version mismatch, selected version is older than this')
          mismatch = true
          break
        }
      }
      if (!mismatch) {
        $osEl.css(match).attr('title', 'OSes match')
      }
    }

    const $browserEl = $el.parent().parent().children('.InvestorGoat-browser')
    if (uaObj.parse.software_type !== InvestorGoatCompareTarget.parse.software_type) {
      $browserEl.css(totalMismatch).attr('title', `Software type mismatch, this is "${uaObj.parse.software_type}", selected is ${InvestorGoatCompareTarget.parse.software_type}`)
    } else if (uaObj.parse.software_sub_type !== InvestorGoatCompareTarget.parse.software_sub_type) {
      $browserEl.css(totalMismatch).attr('title', `Software subtype mismatch, this is "${uaObj.parse.software_sub_type}", selected is ${InvestorGoatCompareTarget.parse.software_sub_type}`)
    } else if (uaObj.parse.software_name_code !== InvestorGoatCompareTarget.parse.software_name_code) {
      $browserEl.css(totalMismatch).attr('title', `Browser mismatch, this is "${uaObj.parse.software_name}", selected is ${InvestorGoatCompareTarget.parse.software_name}`)
    } else {
      let mismatch = false
      for (let i = 0; i < uaObj.parse.software_version_full.length; i++) {
        if (i >= InvestorGoatCompareTarget.parse.software_version_full.length) {
          break
        }
        if (parseInt(uaObj.parse.software_version_full[i]) < parseInt(InvestorGoatCompareTarget.parse.software_version_full[i])) {
          $browserEl.css(versionSelectedAhead).attr('title', 'Browser version mismatch, selected version is newer than this')
          mismatch = true
          break
        } else if (parseInt(uaObj.parse.software_version_full[i]) > parseInt(InvestorGoatCompareTarget.parse.software_version_full[i])) {
          $browserEl.css(versionSelectedBehind).attr('title', 'Browser version mismatch, selected version is older than this')
          mismatch = true
          break
        }
      }
      if (!mismatch) {
        $browserEl.css(match).attr('title', 'Browsers match')
      }
    }
  })
}

const InvestorGoatSPECIALIPS = [
  { addr: '10.0.0.0', cidr: 8, color: 'red', hint: 'Internal IP' },
  { addr: '172.16.0.0', cidr: 12, color: 'red', hint: 'Internal IP' },
  { addr: '192.168.0.0', cidr: 16, color: 'red', hint: 'Internal IP' },
  { addr: '127.0.0.0', cidr: 8, color: 'red', hint: 'Loopback (WTF?)' },
  { addr: '185.15.56.0', cidr: 22, color: 'yellow', hint: 'WMF IP' },
  { addr: '91.198.174.0', cidr: 24, color: 'yellow', hint: 'WMF IP' },
  { addr: '198.35.26.0', cidr: 23, color: 'yellow', hint: 'WMF IP' },
  { addr: '208.80.152.0', cidr: 22, color: 'yellow', hint: 'WMF IP' },
  { addr: '103.102.166.0', cidr: 24, color: 'yellow', hint: 'WMF IP' },
  { addr: '143.228.0.0', cidr: 16, color: 'orange', hint: 'US Congress' },
  { addr: '12.185.56.0', cidr: 29, color: 'orange', hint: 'US Congress' },
  { addr: '12.147.170.144', cidr: 28, color: 'orange', hint: 'US Congress' },
  { addr: '74.119.128.0', cidr: 22, color: 'orange', hint: 'US Congress' },
  { addr: '156.33.0.0', cidr: 16, color: 'orange', hint: 'US Congress' },
  { addr: '165.119.0.0', cidr: 16, color: 'orange', hint: 'Executive Office of the President' },
  { addr: '198.137.240.0', cidr: 23, color: 'orange', hint: 'Executive Office of the President' },
  { addr: '204.68.207.0', cidr: 24, color: 'orange', hint: 'Executive Office of the President' },
  { addr: '149.101.0.0', cidr: 16, color: 'orange', hint: 'US Department of Justice' },
  { addr: '65.165.132.0', cidr: 24, color: 'orange', hint: 'US Dept of Homeland Security' },
  { addr: '204.248.24.0', cidr: 24, color: 'orange', hint: 'US Dept of Homeland Security' },
  { addr: '216.81.80.0', cidr: 20, color: 'orange', hint: 'US Dept of Homeland Security' },
  { addr: '131.132.0.0', cidr: 14, color: 'orange', hint: 'Canadian Dept of National Defence' },
  { addr: '131.136.0.0', cidr: 14, color: 'orange', hint: 'Canadian Dept of National Defence' },
  { addr: '131.140.0.0', cidr: 15, color: 'orange', hint: 'Canadian Dept of National Defence' },
  { addr: '192.197.82.0', cidr: 24, color: 'orange', hint: 'Canadian House of Commons' },
  { addr: '194.60.0.0', cidr: 18, color: 'orange', hint: 'UK Parliament' },
  { addr: '138.162.0.0', cidr: 16, color: 'orange', hint: 'US Department of the Navy' }
]

function InvestorGoatIsIPInRange (addr, targetRange, targetCidr) {
  // https://stackoverflow.com/questions/503052/javascript-is-ip-in-one-of-these-subnets
  const mask = -1 << (32 - +targetCidr) // eslint-disable-line no-bitwise
  if (mw.util.isIPv4Address(addr, false)) {
    const addrMatch = addr.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
    const addrInt = (+addrMatch[1] << 24) + (+addrMatch[2] << 16) + (+addrMatch[3] << 8) + // eslint-disable-line no-bitwise
      (+addrMatch[4]) // eslint-disable-line no-bitwise
    const targetMatch = targetRange.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
    const targetInt = (+targetMatch[1] << 24) + (+targetMatch[2] << 16) + (+targetMatch[3] << 8) + // eslint-disable-line no-bitwise
      (+targetMatch[4]) // eslint-disable-line no-bitwise
    return (addrInt & mask) === (targetInt & mask) // eslint-disable-line no-bitwise
  }
  // TODO: figure out ipv6
}

/**
 * Get all IP userlinks on the page
 *
 * @param {JQuery} $content page contents
 * @return {Map} list of unique users on the page and their corresponding links
 */
function InvestorGoatGetBlockLinks ($content) {
  const userLinks = new Map()

  const blockLinkRe = '^Special:Block/(.*)$'
  $('a', $content).each(function () {
    if (!$(this).attr('title')) {
      // Ignore if the <a> doesn't have a title
      return
    }
    const blockLinkMatch = $(this).attr('title').toString().match(blockLinkRe)
    if (!blockLinkMatch) {
      return
    }
    const user = decodeURIComponent(blockLinkMatch[1])
    if (mw.util.isIPAddress(user)) {
      if (!userLinks.get(user)) {
        userLinks.set(user, [])
      }
      userLinks.get(user).push($(this))
    }
  })
  return userLinks
}

async function InvestorGoatIPHook ($content) {
  const usersOnPage = InvestorGoatGetBlockLinks($content)
  usersOnPage.forEach(async (val, key, _) => {
    let color = ''
    let hint = ''
    for (const range of InvestorGoatSPECIALIPS) {
      if (InvestorGoatIsIPInRange(key, range.addr, range.cidr)) {
        color = range.color
        hint = range.hint
        break
      }
    }
    if (!color) {
      return
    }
    val.forEach(($link) => {
      $link.css({ backgroundColor: color })
      $link.attr('title', hint)
    })
  })
}

const InvestorGoatCHECKREASONS = [
  { label: 'Check type (optional)', selected: true, value: '', disabled: true },
  { label: 'SPI-related', selected: false, value: 'spi' },
  { label: 'Second Opinion', selected: false, value: '2o' },
  { label: 'Unblock Request', selected: false, value: 'unblock' },
  { label: 'IPBE Request', selected: false, value: 'ipbe' },
  { label: 'ACC Request', selected: false, value: 'acc' },
  { label: 'CU/Paid Queue', selected: false, value: 'q' },
  { label: 'Suspected known sockmaster', selected: false, value: 'sock' },
  { label: 'Suspected LTA', selected: false, value: 'lta' },
  { label: 'Comparison to ongoing CU', selected: false, value: 'comp' },
  { label: 'Collateral check', selected: false, value: 'coll' },
  { label: 'Discretionary check', selected: false, value: 'fish' },
  { label: 'Self-check for testing', selected: false, value: 'test' }
]

function InvestorGoatAddQuickReasonBoxHook ($content) {
  const $select = $('<select>')
  for (const reason of InvestorGoatCHECKREASONS) {
    $('<option>')
      .val(reason.value)
      .prop('selected', reason.selected)
      .text(reason.label)
      .prop('disabled', reason.disabled)
      .appendTo($select)
  }

  $select.on('change', function (e) {
    InvestorGoatAddQuickReason($(e.target))
  })

  const $target = $('#checkreason', $content)

  $select.insertBefore($target)
}

/**
 * Highlight CU log links where the log exists
 *
 * @param {JQuery} $content page contents
 */
function InvestorGoatHighlightLogs ($content) {
  const cuSearchTargetRe = 'cuSearch=(.*)'
  $('a.external.text', $content).each(async function () {
    if (!$(this).attr('href')) {
      // Ignore if the <a> doesn't have a title
      return
    }
    const cuTargetMatch = $(this).attr('href').toString().match(cuSearchTargetRe)
    if (!cuTargetMatch) {
      return
    }
    const target = decodeURIComponent(cuTargetMatch[1])
    const api = new mw.Api()
    const request = {
      action: 'query',
      list: 'checkuserlog',
      cultarget: target
    }
    try {
      const response = await api.get(request)
      const checkCount = response.query.checkuserlog.entries.length
      if (checkCount > 0) {
        $(this).attr('title', `${checkCount} checks`)
        // Have to use .style vice .css because .css doesn't understand !important
        $(this).attr('style', 'background-color: lightgreen !important')
      }
    } catch (error) {
      console.log(`Error checking CU log: ${error}`)
    }
  })
}

function InvestorGoatAddQuickReason (source) {
  const $inputField = $('#checkreason')
  $inputField.val('[' + source.val() + '] ' + $inputField.val())
}
// </nowiki>
