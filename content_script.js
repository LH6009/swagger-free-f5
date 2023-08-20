let SWAGGER_VERSION; // swagger版本
let BASE_URL; // baseUrl
const TEXTAREA_INIT_VALUE_MAP = {}; // textarea初始值map

chrome.runtime.sendMessage({ action: "checkPage" }, (response) => {
  if (response && response.exists) {
    allFunctions();
  }
});

function allFunctions() {
  // 获取swagger版本
  function getSwaggerVersion() {
    const scriptElements = document.querySelectorAll('script');
    const scriptSources = Array.from(scriptElements).map(function (script) {
      return script.src;
    });
    const searchString = "/springfox.js?v=";
    scriptSources.forEach(function(link) {
      if (link.includes(searchString)) {
        const startIndex = link.indexOf(searchString) + searchString.length;
        SWAGGER_VERSION = link.substring(startIndex);
      }
    });
  }

  // 获取baseUrl
  function getBaseUrl(mutationsList) {
    if (BASE_URL === undefined) {
      for (const mutation of mutationsList) {
        let targetNode = mutation.target;
        if (targetNode.classList.contains('swagger-ui')) {
          const base = document.querySelector("#swagger-ui > section > div.swagger-ui > div:nth-child(2) > div.information-container.wrapper > section > div > div > hgroup > pre");
          if (base !== null) {
            const inputString = base.textContent.trim();
            const prefix = "[ Base URL: ";
            const suffix = " ]";
            const startIndex = inputString.indexOf(prefix) + prefix.length;
            const endIndex = inputString.indexOf(suffix, startIndex);
            if (startIndex >= 0 && endIndex >= 0) {
              BASE_URL = inputString.substring(startIndex, endIndex);
              break;
            }
          }
        }
      }
    }
  }

  // 页面加载完成后执行
  window.onload = function() {
    // 获取swagger版本
    getSwaggerVersion();
  }

  // dom变化监听
  const observer = new MutationObserver((mutationsList, observer) => {
    // for (let mutation of mutationsList) {
    //   const mutationType = mutation.type;
    //   const targetNode = mutation.target;
    //   const addedNodes = mutation.addedNodes;
    //   const removedNodes = mutation.removedNodes;
    //   console.log(mutationType)
    //   console.log(targetNode)
    //   console.log(addedNodes)
    //   console.log(removedNodes)
    // }
    if (SWAGGER_VERSION === '2.9.2') {
      // 获取baseUrl
      getBaseUrl(mutationsList);
      // 处理dom方法
      deal(mutationsList);
    }
  });

  // 配置MutationObserver
  observer.observe(document, { childList: true, subtree: true });

  // 生成key部分
  function generateKeyPart(targetNode) {
    const parentElement = targetNode.parentElement;
    const previousSibling = parentElement.previousElementSibling;
    const methodSpanElement = previousSibling.querySelector('.opblock-summary-method');
    const methodText = methodSpanElement.textContent;
    const pathSpanElement = previousSibling.querySelector('.opblock-summary-path span');
    const pathText = pathSpanElement.textContent;
    return BASE_URL + pathText + methodText;
  }

  // 判断是否满足触发策略
  function isCanDeal(mutationsList) {
    for (let mutation of mutationsList) {
      let targetNode = mutation.target;
      let addedNodes = mutation.addedNodes;
      if (targetNode.classList.contains('opblock-body') && addedNodes.length > 0) {
        return mutation;
      }
    }
    return null
  }

  // 赋值并设置监听器
  function setDataAndAddListener(key, dom) {
    const localValue = localStorage.getItem(key);
    if (dom.tagName === 'INPUT') {
      if (localValue) {
        dom.value = localValue
      }
      dom.addEventListener('input', () => {
        const content = dom.value;
        localStorage.setItem(key, content);
      });
    } else if (dom.tagName === 'TEXTAREA') {
      dom.id = key;
      let initValue;
      if (!(key in TEXTAREA_INIT_VALUE_MAP)) {
        initValue = dom.value
        TEXTAREA_INIT_VALUE_MAP[key] = dom.value;
      } else {
        initValue = TEXTAREA_INIT_VALUE_MAP[key]
      }
      if (localValue && localValue !== initValue) {
        const newValue = dealLocalValueIfModelChange(initValue, localValue);
        dom.innerHTML = newValue
        dom.value = newValue
      }
      dom.addEventListener('input', () => {
        observerTextarea.disconnect();
        const content = dom.value;
        if (content !== initValue) {
          localStorage.setItem(key, content);
        }
        observerTextarea.observe(dom, {attributes: true, childList: true, subtree: true});
      });
      const observerTextarea = new MutationObserver((mutationsList, observerTextarea) => {
        observerTextarea.disconnect();
        mutationsList.forEach(mutation => {
          const targetNode = mutation.target;
          if (mutation.type === "childList" && targetNode.type === 'textarea' && targetNode.classList.contains('body-param__text')) {
            const localValue = localStorage.getItem(targetNode.id);
            if (localValue && localValue !== initValue) {
              const newValue = dealLocalValueIfModelChange(initValue, localValue);
              targetNode.innerHTML = newValue
              targetNode.value = newValue
            }
          }
        });
        observerTextarea.observe(dom, {attributes: true, childList: true, subtree: true});
      });
      observerTextarea.observe(dom, {attributes: true, childList: true, subtree: true});
    }
  }

  // 处理dom方法
  function deal(mutationsList) {
    const targetMutation = isCanDeal(mutationsList);
    if (targetMutation !== null) {
      let targetNode = targetMutation.target;
      const keyPart = generateKeyPart(targetNode);
      const parameterRows = targetNode.querySelectorAll('tr.parameters');
      parameterRows.forEach(function(row) {
        const descriptionCell = row.querySelector('td.col.parameters-col_description');
        const markdown = descriptionCell.querySelector('div.markdown');
        const paramKey = markdown.textContent;
        const key = keyPart + paramKey;
        const expectDom = markdown.nextElementSibling;
        if (expectDom !== null) {
          if (expectDom.tagName === 'INPUT') {
            if (expectDom.type === 'text') {
              setDataAndAddListener(key, expectDom);
            }
          } else if (expectDom.tagName === 'DIV') {
            const bodyParamDom = expectDom.querySelector('textarea.body-param__text');
            if (bodyParamDom !== null) {
              setDataAndAddListener(key, bodyParamDom);
            }
          }
        }
      });
    }
  }

  // localValue适配model更新
  function dealLocalValueIfModelChange(initValue, localValue) {
    let initValueObject, localValueObject, flag;
    try {
      initValueObject = JSON.parse(initValue);
      localValueObject = JSON.parse(localValue);
      flag = (Object.keys(initValueObject).length !== 0) && (Object.keys(localValueObject).length !== 0);
    } catch (error) {
      flag = false;
    }
    if (flag) {
      for (let key in localValueObject) {
        if (localValueObject.hasOwnProperty(key) && initValueObject.hasOwnProperty(key)) {
          initValueObject[key] = localValueObject[key];
        }
      }
      return JSON.stringify(initValueObject, null, 4);
    }
    return localValue;
  }
}
