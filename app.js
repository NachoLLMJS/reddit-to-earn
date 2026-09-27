const state={step:1,verified:false,claimed:false,rewardDisplay:'— RDDT',claim:null};
const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const config=window.KARMA_CONFIG||window.REARN_CONFIG||{};

const toast=(message)=>{
  const element=$('#toast');
  $('p',element).textContent=message;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>element.classList.remove('show'),3600);
};

$$('.js-buy').forEach(button=>button.addEventListener('click',()=>{
  if(config.buyUrl){location.assign(config.buyUrl);return;}
  toast('$KARMA 官方购买入口将在合约验证后开放');
}));
$$('.js-start').forEach(button=>button.addEventListener('click',()=>$('#claim').scrollIntoView({behavior:'smooth'})));

const fields={profile:$('#redditProfile'),wallet:$('#rewardWallet'),post:$('#redditPost')};
const normalizedProfile=()=>fields.profile.value.trim();
const isValidProfile=value=>/^(?:u\/)?[A-Za-z0-9_-]{3,20}$/.test(value)||/^https?:\/\/(?:www\.)?reddit\.com\/user\/[A-Za-z0-9_-]{3,20}\/?(?:\?.*)?$/i.test(value);
const isValidWallet=value=>/^0x[0-9a-fA-F]{40}$/.test(value.trim());

function isValidRedditPost(value){
  try{
    const url=new URL(value.trim());
    const host=url.hostname.toLowerCase();
    const allowedHost=/^(?:www\.|old\.|new\.)?reddit\.com$/i.test(host)||host==='redd.it';
    const isPost=host==='redd.it'?url.pathname.length>2:/\/comments\/[a-z0-9]+/i.test(url.pathname);
    return url.protocol==='https:'&&allowedHost&&isPost;
  }catch{return false;}
}

function markInvalid(input,message){
  input.closest('.input-shell')?.classList.add('invalid');
  input.focus();
  toast(message);
  return false;
}

Object.values(fields).forEach(input=>input.addEventListener('input',()=>input.closest('.input-shell')?.classList.remove('invalid')));

function validateStep(step){
  if(step===1){
    if(!isValidProfile(normalizedProfile()))return markInvalid(fields.profile,'请输入有效的 Reddit 用户名或主页链接');
    if(!isValidWallet(fields.wallet.value))return markInvalid(fields.wallet,'请输入完整的 0x 钱包地址');
  }
  if(step===2&&!isValidRedditPost(fields.post.value))return markInvalid(fields.post,'请输入有效的 Reddit 帖子链接');
  return true;
}

function resetVerification(){
  state.verified=false;
  state.claimed=false;
  state.rewardDisplay='— RDDT';
  state.claim=null;
  $('#reviewReward').textContent='待验证';
  $('#submitPostBtn').hidden=false;
  $('#submitPostBtn').disabled=false;
  $('#submitPostBtn').innerHTML='验证 Reddit 链接 <b>↗</b>';
  $('#claimRddtBtn').hidden=true;
  $('#reviewState').className='review-state';
  $('#reviewState').innerHTML='<span>●</span><p><b>等待链接验证</b><small>链接通过验证后，代币化 RDDT 才会进入可领取状态</small></p>';
}
Object.values(fields).forEach(input=>input.addEventListener('input',resetVerification));

function showStep(step){
  if(step>state.step&&state.step<3&&!validateStep(state.step))return;
  state.step=step;
  $$('.form-panel').forEach(panel=>panel.classList.toggle('active',Number(panel.dataset.formStep)===step));
  $$('.submission-step').forEach(button=>{
    const buttonStep=Number(button.dataset.stepNav);
    button.classList.toggle('active',buttonStep===step);
    button.classList.toggle('done',buttonStep<step);
  });
  if(step===3){
    $('#reviewProfile').textContent=normalizedProfile();
    const wallet=fields.wallet.value.trim();
    $('#reviewWallet').textContent=`${wallet.slice(0,8)}…${wallet.slice(-6)}`;
    $('#reviewPost').textContent=fields.post.value.trim();
  }
}

$$('[data-next-step]').forEach(button=>button.addEventListener('click',()=>showStep(Number(button.dataset.nextStep))));
$$('[data-prev-step]').forEach(button=>button.addEventListener('click',()=>showStep(Number(button.dataset.prevStep))));
$$('[data-step-nav]').forEach(button=>button.addEventListener('click',()=>{const target=Number(button.dataset.stepNav);if(target<=state.step)showStep(target);}));

$('#submissionForm').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!validateStep(1)){showStep(1);return;}
  if(!validateStep(2)){showStep(2);return;}
  if(!config.redditVerifyUrl){
    toast('Reddit 链接验证正在等待安全后端配置');
    $('#reviewState').className='review-state pending';
    $('#reviewState').innerHTML='<span>●</span><p><b>验证服务尚未配置</b><small>不会在没有真实验证结果时开放 RDDT 领取</small></p>';
    return;
  }

  const button=$('#submitPostBtn');
  button.disabled=true;
  button.textContent='正在验证 Reddit 链接…';
  $('#reviewState').className='review-state checking';
  $('#reviewState').innerHTML='<span>●</span><p><b>正在核对公开帖子</b><small>检查作者、链接状态与活动条件</small></p>';

  try{
    const response=await fetch(config.redditVerifyUrl,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({redditProfile:normalizedProfile(),walletAddress:fields.wallet.value.trim(),postUrl:fields.post.value.trim()})});
    const data=await response.json();
    if(!response.ok||data.verified!==true)throw new Error(data.message||'该 Reddit 链接未通过验证');
    if(typeof data.rewardDisplay!=='string'||!data.rewardDisplay.trim())throw new Error('验证服务未返回 RDDT 奖励金额');

    state.verified=true;
    state.rewardDisplay=data.rewardDisplay.trim();
    state.claim=data.claim||null;
    $('#reviewReward').textContent=state.rewardDisplay;
    $('#reviewState').className='review-state verified';
    $('#reviewState').innerHTML='<span>✓</span><p><b>Reddit 链接已通过验证</b><small>代币化 RDDT 已进入可领取状态</small></p>';
    button.hidden=true;
    const claimButton=$('#claimRddtBtn');
    claimButton.hidden=false;
    claimButton.innerHTML=`领取 ${state.rewardDisplay} <b>↗</b>`;
    toast('Reddit 帖子验证通过，可以领取代币化 RDDT');
  }catch(error){
    resetVerification();
    $('#reviewState').className='review-state failed';
    const statusText=String(error?.message||'验证失败');
    $('#reviewState').innerHTML='<span>×</span><p><b>链接未通过验证</b><small></small></p>';
    $('small',$('#reviewState')).textContent=statusText;
    toast(statusText);
  }finally{
    button.disabled=false;
    if(!state.verified)button.innerHTML='重新验证 Reddit 链接 <b>↗</b>';
  }
});

$('#claimRddtBtn').addEventListener('click',async()=>{
  if(!state.verified||state.claimed)return;
  const claim=state.claim||{};
  const expectedContract=config.claimContract?.toLowerCase();
  const claimTarget=(claim.to||config.claimContract||'').toLowerCase();
  const claimData=claim.data||config.claimCalldata;
  const claimChain=claim.chainId||config.requiredChainId;
  if(!window.ethereum||!/^0x[0-9a-f]{40}$/i.test(expectedContract||'')||claimTarget!==expectedContract||!/^0x[0-9a-f]+$/i.test(claimData||'')||!/^0x[0-9a-f]+$/i.test(claimChain||'')){
    toast('代币化 RDDT 领取合约尚未完成验证配置');
    return;
  }

  const button=$('#claimRddtBtn');
  button.disabled=true;
  button.textContent='请在钱包中确认…';
  try{
    const accounts=await window.ethereum.request({method:'eth_requestAccounts'});
    const account=accounts?.[0];
    if(!account)throw new Error('钱包未返回账户');
    if(account.toLowerCase()!==fields.wallet.value.trim().toLowerCase())throw new Error('当前钱包与提交的奖励地址不一致');
    const activeChain=await window.ethereum.request({method:'eth_chainId'});
    if(activeChain.toLowerCase()!==claimChain.toLowerCase())await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:claimChain}]});
    const hash=await window.ethereum.request({method:'eth_sendTransaction',params:[{from:account,to:config.claimContract,data:claimData,value:'0x0'}]});
    state.claimed=true;
    button.textContent='RDDT 领取交易已提交 ✓';
    $('#reviewState').className='review-state verified';
    $('#reviewState').innerHTML='<span>✓</span><p><b>领取交易已提交</b><small></small></p>';
    $('small',$('#reviewState')).textContent=`${hash.slice(0,10)}…`;
    toast(`RDDT 领取交易已提交 · ${hash.slice(0,10)}…`);
  }catch(error){
    button.disabled=false;
    button.innerHTML=`领取 ${state.rewardDisplay} <b>↗</b>`;
    toast(error?.message||'领取已取消');
  }
});

const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('in');}),{threshold:.12});
$$('.reveal').forEach(element=>revealObserver.observe(element));
showStep(1);
