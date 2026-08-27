class Component extends DCLogic {
  constructor(props){
    super(props);
    this.state = {
      orientation: props.orientation || 'portrait',
      panel: 'none',      // none | info | next | ig
      elModule: 'vote',   // vote | about | music
      playing: true,
      voteSel: null,
      voted: null,
      scale: 1,
      scrubbing: false,
      scrubPct: 0,
      behindS: 0,
      phase: 'live',
      ratingPending: true,
      ratingPhase: 'hidden',
      pControls: true,

      ctrlSel: null,
      toast: false,
      battle: false,
      ad: false,
      adCount: 8,
      adModal: false,
      adSent: false,
      menuChoice: {cc:1, audio:0, settings:0},
      volOpen: false,
      volPct: 46,
      lsControls: true,
      lsPanel: false,
      skipOn: false,
      squeeze: null,      // null | 'stack' | 'banner'
      squeezeCount: 15,
      curSeg: 0,
    };
    this.RATING_HOLD = 5000;
    this.SEGMENTS = [
      {t:0,   dancer:'Jesse Sykes',   track:'The Way I Are',       artist:'Timbaland'},
      {t:58,  dancer:'Harini',        track:'Poison',              artist:'Bell Biv DeVoe'},
      {t:119, dancer:'Jabari',        track:'Chanel',              artist:'Tyla'},
      {t:178, dancer:'Vik White',     track:'Pass The Dutch',      artist:'Missy Elliott'},
      {t:239, dancer:'Rylee Prodigy', track:'Push the Feeling On', artist:'Nightcrawlers'},
      {t:299, dancer:'Jesse Sykes',   track:'Hollaback Girl',      artist:'Gwen Stefani'}
    ];
    this.BIOS = {
      'Jesse Sykes':'Freestyle competitor bringing sharp musicality and character to every round of the USA Qualifier.',
      'Harini':'All-styles dancer known for switching effortlessly between grooves when the DJ flips the track.',
      'Jabari':'Raw energy and crowd control — feeding off the audience with every beat.',
      'Vik White':'Signature spins and showmanship — a crowd favorite from the moment the music drops.',
      'Rylee Prodigy':'Young powerhouse mixing technical footwork with fearless improvisation.'
    };
    this.rootEl=null; this.deviceEl=null; this.videoEl=null;
    this.rootRef=(el)=>{ if(el) this.rootEl=el; };
    this.deviceRef=(el)=>{ if(el){ this.deviceEl=el; this.fit(); } };
    this.segIdxAt=(t)=>{ let idx=0; for(let i=0;i<this.SEGMENTS.length;i++){ if(t>=this.SEGMENTS[i].t) idx=i; } return idx; };
    this.videoRef=(el)=>{
      if(el && el!==this.videoEl){
        this.videoEl=el; el.muted=true; el.loop=true; el.playsInline=true; el.preload='auto';
        el.addEventListener('timeupdate', ()=>{
          const seg=this.segIdxAt(el.currentTime||0);
          const patch={};
          if(!this.state.scrubbing && el.duration && !this.isLD()){ patch.scrubPct=(el.currentTime/el.duration)*100; }
          if(seg!==this.state.curSeg){ patch.curSeg=seg; patch.voteSel=null; patch.voted=null; }
          if(Object.keys(patch).length) this.setState(patch);
        });
        const p=el.play(); if(p&&p.catch) p.catch(()=>{});
      }
    };
    // Maturity rating — spec: fades on when the controls first dismiss, holds
    // ~5s, once per playback; re-armed on format change / demo trigger.
    this.maybeShowRating=()=>{
      const s=this.state;
      if(!s.ratingPending || s.toast || s.ad || s.squeeze || s.ctrlSel) return;
      clearTimeout(this.ratingT); clearTimeout(this.ratingHoldT);
      this.setState({ratingPhase:'in', ratingPending:false});
      this.ratingHoldT=setTimeout(()=>this.ratingOut(), this.RATING_HOLD);
    };
    this.ratingOut=()=>{ if(this.state.ratingPhase!=='in') return; clearTimeout(this.ratingT); this.setState({ratingPhase:'out'}); this.ratingT=setTimeout(()=>this.setState({ratingPhase:'hidden'}), 680); };
    this.notifyOrient=(o)=>{ if(typeof this.props.onOrient==='function') this.props.onOrient(o); };
    this.setPortrait=()=>{ this.setState({orientation:'portrait'}); this.notifyOrient('portrait'); };
    this.setLandscape=()=>{ this.setState({orientation:'landscape', panel:'none', lsPanel:false, lsControls:true, scrubbing:false}); this.notifyOrient('landscape'); this.armLsHide(); };
    this.openInfo=()=>this.setState(s=>({panel: s.panel==='info' ? 'none' : 'info'}));
    this.closePanel=()=>this.setState({panel:'none'});
    this.setVote=()=>this.setState({elModule:'vote'});
    this.setAbout=()=>this.setState({elModule:'about'});
    this.setMusic=()=>this.setState({elModule:'music'});
    this.togglePlay=()=>{ this.setState(s=>({playing:!s.playing})); this.armLsHide(); };
    this.goLive=()=>{ this.setState({behindS:0}); };
    this.back10=()=>{ if(this.isLD()){ this.setState(s=>({behindS: Math.min(this.DVR_W, s.behindS+10)})); } else if(this.videoEl){ this.videoEl.currentTime=Math.max(0,this.videoEl.currentTime-10); } this.armLsHide(); };
    this.fwd10=()=>{ if(this.isLD()){ this.setState(s=>({behindS: Math.max(0, s.behindS-10)})); } else if(this.videoEl){ this.videoEl.currentTime=this.videoEl.currentTime+10; } this.armLsHide(); };
    this.lsInfo=()=>{ this.setState(s=>({panel: s.panel==='info'?'none':'info'})); this.armLsHide(); };
    this.lsNext=()=>{ this.setState(s=>({panel: s.panel==='next'?'none':'next'})); this.armLsHide(); };
    this.openNext=()=>{ this.setState(s=>({panel: s.panel==='next'?'none':'next'})); };
    this.cardStartOver=()=>{ if(this.videoEl){ try{ this.videoEl.currentTime=0; }catch(e){} } this.setState({ratingPending:true}); this.armLsHide(); };
    // Single Ease Live entry point: the wand button. Portrait opens the
    // below-player panel; landscape opens the split side panel.
    this.openEL=(mod)=>{
      if(this.state.orientation==='landscape'){
        this.setState({lsPanel:true, elModule:mod, lsControls:false, ctrlSel:null, panel:'none'});
      } else {
        this.setState({panel:'ig', elModule:mod, lsPanel:false});
      }
      this.ratingOut();
    };
    this.openELBtn=()=>this.openEL('vote');
    this.closeLsPanel=()=>{ this.setState({lsPanel:false, lsControls:true}); this.armLsHide(); };
    this.skipTap=()=>{ clearTimeout(this.skipT); if(this.videoEl){ try{ this.videoEl.currentTime=Math.min((this.videoEl.duration||0), this.videoEl.currentTime+25); }catch(e){} } this.setState({skipOn:false}); };
    this.onVoteSel=(e)=>{ const i=parseInt(e.currentTarget.dataset.i,10); this.setState({voteSel:i}); };
    this.castVote=()=>{ if(this.state.voteSel===null) return; this.setState(s=>({voted:s.voteSel})); };
    this.changeVote=()=>{ this.setState({voted:null}); };
    this.jumpSeg=(e)=>{ const i=parseInt(e.currentTarget.dataset.i,10); const t=this.SEGMENTS[i].t; if(this.videoEl){ try{ this.videoEl.currentTime=t; }catch(err){} } this.setState({playing:true}); };
    this.pArmHide=()=>{ clearTimeout(this.pT); this.pT=setTimeout(()=>{ if(!this.state.scrubbing && !this.state.volOpen && !this.state.ctrlSel && !this.state.toast && !this.state.ad){ this.setState({pControls:false, lsControls:false}); setTimeout(()=>this.maybeShowRating(), 60); } }, 5000); };
    this.pTap=()=>{ if(this.state.scrubbing) return; if(this.state.squeeze) return; if(this.state.panel!=='none'){ this.setState({panel:'none', pControls:true}); this.pArmHide(); return; } const n=!this.state.pControls; this.setState({pControls:n}); if(n){ this.ratingOut(); this.pArmHide(); } else { setTimeout(()=>this.maybeShowRating(), 60); } };
    this.MENUS={
      cc:{title:'SUBTITLES', opts:['Off','English (Original)','English (CC)','Spanish','French']},
      audio:{title:'AUDIO', opts:['English 5.1','English Stereo','Original mix','Director commentary']},
      settings:{title:'PLAYBACK & QUALITY', opts:['Auto · 1080p HDR','1080p','720p','Data saver']}
    };
    this.selCtrl=(e)=>{ const k=e.currentTarget.dataset.ctrl; this.setState(s=>({ctrlSel: s.ctrlSel===k ? null : k})); this.armLsHide(); };
    this.openMore=()=>{ this.setState(s=>({ctrlSel: s.ctrlSel==='more' ? null : 'more'})); this.armLsHide(); };
    this.chooseMenu=(e)=>{ const i=parseInt(e.currentTarget.dataset.i,10); const k=this.state.ctrlSel; if(!k) return;
      if(k==='more'){ const cat=['cc','audio','settings'][i]; this.setState({ctrlSel:cat}); return; }
      this.setState(s=>{ const mc=Object.assign({},s.menuChoice); mc[k]=i; return {menuChoice:mc, ctrlSel:null}; }); this.armLsHide(); };
    this.closeMenu=()=>{ this.setState({ctrlSel:null}); this.armLsHide(); };
    this.scrubRect=null;
    this.DVR_W=240;
    this.isLD=()=>((this.props.format||'live-dvr')==='live-dvr');
    this.pctFromX=(x)=>{ const r=this.scrubRect; if(!r) return this.state.scrubPct; return Math.max(0, Math.min(100, (x-r.left)/r.width*100)); };
    this.scrubDown=(e)=>{
      const f0=this.props.format||'live-dvr';
      if(f0==='linear'||f0==='live') return;
      e.preventDefault();
      const track=e.currentTarget; this.scrubRect=track.getBoundingClientRect();
      this.setState({scrubbing:true, scrubPct:this.pctFromX(e.clientX)});
      this._mv=(ev)=>{ this.setState({scrubPct:this.pctFromX(ev.clientX)}); };
      this._up=()=>{
        window.removeEventListener('pointermove', this._mv);
        window.removeEventListener('pointerup', this._up);
        if(this.isLD()){
          const ratio=(this.state.scrubPct||0)/100;
          const nb = ratio>=0.65 ? 0 : Math.max(0, Math.min(this.DVR_W, this.DVR_W*(1-ratio/0.65)));
          this.setState({scrubbing:false, behindS:nb}); this.armLsHide();
          return;
        }
        if(this.videoEl && this.videoEl.duration){ try{ this.videoEl.currentTime=(this.state.scrubPct/100)*this.videoEl.duration; }catch(err){} }
        this.setState({scrubbing:false}); this.armLsHide();
      };
      window.addEventListener('pointermove', this._mv);
      window.addEventListener('pointerup', this._up);
    };
    this.toggleVol=()=>{ this.setState(s=>({volOpen:!s.volOpen})); this.armVolClose(); this.armLsHide(); };
    this.armVolClose=()=>{ clearTimeout(this.volT); this.volT=setTimeout(()=>this.setState({volOpen:false}), 4000); };
    this.volRect=null;
    this.volPctFromX=(x)=>{ const r=this.volRect; if(!r) return this.state.volPct; return Math.max(0, Math.min(100, (x-r.left)/r.width*100)); };
    this.volDown=(e)=>{ e.preventDefault(); this.volRect=e.currentTarget.getBoundingClientRect(); this.setState({volPct:this.volPctFromX(e.clientX), volOpen:true});
      this._vmv=(ev)=>{ this.setState({volPct:this.volPctFromX(ev.clientX)}); this.armVolClose(); };
      this._vup=()=>{ window.removeEventListener('pointermove',this._vmv); window.removeEventListener('pointerup',this._vup); this.armVolClose(); };
      window.addEventListener('pointermove',this._vmv); window.addEventListener('pointerup',this._vup); };
    this.armLsHide=()=>{ clearTimeout(this.lsT); this.lsT=setTimeout(()=>{ if(!this.state.scrubbing && !this.state.volOpen && !this.state.ctrlSel){ this.setState({lsControls:false, pControls:false}); setTimeout(()=>this.maybeShowRating(), 60); } }, 5000); };
    this.lsTap=()=>{ if(this.state.scrubbing) return; if(this.state.squeeze) return; if(this.state.lsPanel){ this.closeLsPanel(); return; } if(this.state.panel!=='none'){ this.setState({panel:'none', lsControls:true}); this.armLsHide(); return; } const next=!this.state.lsControls; this.setState({lsControls:next}); if(next){ this.ratingOut(); this.armLsHide(); } else { setTimeout(()=>this.maybeShowRating(), 60); } };
  }

  componentDidMount(){
    this.onResize=()=>this.fit();
    window.addEventListener('resize', this.onResize);
    if(window.ResizeObserver && this.deviceEl && this.deviceEl.parentElement){
      this.ro=new ResizeObserver(()=>this.fit());
      this.ro.observe(this.deviceEl.parentElement);
    }
    this.fit(); setTimeout(()=>this.fit(),120);
    this.pArmHide();
  }

  componentWillUnmount(){
    window.removeEventListener('resize', this.onResize);
    if(this.ro) this.ro.disconnect();
    clearTimeout(this.ratingHoldT); clearTimeout(this.ratingT); clearTimeout(this.pT); clearTimeout(this.lsT); clearTimeout(this.volT); clearTimeout(this.skipT); clearTimeout(this.toastT);
    clearInterval(this.adT); clearInterval(this.sqT);
  }
  componentDidUpdate(prevProps){
    this.fit();
    if(this.videoEl){
      if(this.state.playing && this.videoEl.paused){ const p=this.videoEl.play(); if(p&&p.catch) p.catch(()=>{}); }
      else if(!this.state.playing && !this.videoEl.paused){ this.videoEl.pause(); }
    }
    if(prevProps && this.props.cmdSeq !== prevProps.cmdSeq && this.props.cmdSeq){ this.runCmd(this.props.cmd); }
    if(prevProps && this.props.format !== prevProps.format){
      // format switch = new asset → the rating first-entry recurs
      clearTimeout(this.ratingHoldT); clearTimeout(this.ratingT);
      this.setState({ratingPending:true, ratingPhase:'hidden', pControls:true, lsControls:true});
      this.pArmHide();
    }
  }
  runCmd(name){
    if(name==='toast'){ if(!this.elOk()) return; clearTimeout(this.toastT); this.setState({toast:true, battle:false, ad:false}); this.toastT=setTimeout(()=>this.setState({toast:false}), 6000); }
    else if(name==='battle'){ if(!this.elOk()) return; clearTimeout(this.toastT); this.setState({toast:true, battle:true, ad:false}); this.toastT=setTimeout(()=>this.setState({toast:false}), 6000); }
    else if(name==='skip'){ clearTimeout(this.skipT); this.setState({skipOn:true, ad:false, pControls:false, lsControls:false, ctrlSel:null, scrubbing:false}); this.skipT=setTimeout(()=>this.setState({skipOn:false}), 4000); }
    else if(name==='auto'){ if(!this.elOk()) return; this.setState({toast:false, ad:false, ctrlSel:null}); this.openEL('vote'); }
    else if(name==='landscape'){ if(this.state.orientation!=='landscape') this.setLandscape(); }
    else if(name==='portrait'){ if(this.state.orientation!=='portrait') this.setState({orientation:'portrait', panel:'none', lsPanel:false, ctrlSel:null, scrubbing:false}); }
    else if(name==='rating'){ clearTimeout(this.ratingHoldT); clearTimeout(this.ratingT); this.setState({ratingPending:true, ratingPhase:'hidden'}); if(!this.state.pControls && !this.state.lsControls){ setTimeout(()=>this.maybeShowRating(), 80); } }
    else if(name==='ad'){ this.endSqueeze(true); clearInterval(this.adT); this.setState({ad:true, adModal:false, adSent:false, toast:false, ctrlSel:null, adCount:8, playing:false}); this.adT=setInterval(()=>{ this.setState(s=>{ if(s.adModal) return {}; const v=s.adCount-1; if(v<=0){ clearInterval(this.adT); setTimeout(()=>this.setState({ad:false, playing:true}),20); return {adCount:0}; } return {adCount:v}; }); },1000); }
    else if(name==='ad-split'){ this.startSqueeze('stack'); }
    else if(name==='ad-banner'){ this.startSqueeze('banner'); }
  }
  startSqueeze(mode){
    clearInterval(this.sqT);
    this.setState({squeeze:mode, squeezeCount:15, toast:false, ad:false, ctrlSel:null, panel:'none', lsPanel:false, pControls:false, lsControls:false, playing:true});
    this.ratingOut();
    this.sqT=setInterval(()=>{
      this.setState(s=>{
        const v=s.squeezeCount-1;
        if(v<=0){ clearInterval(this.sqT); setTimeout(()=>this.endSqueeze(),30); return {squeezeCount:0}; }
        return {squeezeCount:v};
      });
    },1000);
  }
  endSqueeze(silent){
    clearInterval(this.sqT);
    if(this.sqVideoEl){ try{ this.sqVideoEl.pause(); }catch(e){} }
    if(!this.state.squeeze) return;
    this.setState({squeeze:null});
  }
  elOk(){ const f=this.props.format||'live-dvr'; return f==='live-dvr'||f==='live'; }
  seekOk(){ const f=this.props.format||'live-dvr'; return f==='live-dvr'||f==='vod'; }
  acceptToast(){ this.setState({toast:false}); this.openEL('vote'); }
  dismissToast(){ clearTimeout(this.toastT); this.setState({toast:false}); }
  closeAd(){ clearInterval(this.adT); this.setState({ad:false, adModal:false, playing:true}); if(this.adVideoEl){ try{ this.adVideoEl.pause(); }catch(e){} } }
  adVideoRef=(el)=>{ if(el && el!==this.adVideoEl){ this.adVideoEl=el; el.muted=true; el.loop=true; el.playsInline=true; const tryPlay=()=>{ if(!el.isConnected || el!==this.adVideoEl || !this.state.ad) return; const p=el.play(); if(p&&p.catch) p.catch(()=>setTimeout(tryPlay,150)); }; el.addEventListener('loadeddata', tryPlay); tryPlay(); } };
  sqVideoRef=(el)=>{ if(el && el!==this.sqVideoEl){ this.sqVideoEl=el; el.muted=true; el.loop=true; el.playsInline=true; const tryPlay=()=>{ if(!el.isConnected || el!==this.sqVideoEl || !this.state.squeeze) return; const p=el.play(); if(p&&p.catch) p.catch(()=>setTimeout(tryPlay,150)); }; el.addEventListener('loadeddata', tryPlay); tryPlay(); } };
  sendPhone(){ this.setState({adModal:true, adSent:true}); }
  closeModal(){ this.setState({adModal:false}); }
  adSkipTap(){ if(this.state.adCount<=5) this.closeAd(); }
  openAdSheet(){
    if(this.state.orientation!=='portrait'){
      this.setState({adModal:true});
    } else {
      this.setState({adModal:true});
    }
  }

  fit(){
    const el=this.deviceEl; if(!el) return;
    const stage=el.parentElement; if(!stage) return;
    const W = this.state.orientation==='portrait' ? 390 : 844;
    const H = this.state.orientation==='portrait' ? 844 : 390;
    const aw = stage.clientWidth-56, ah = stage.clientHeight-120;
    let sc = Math.min(aw/W, ah/H); if(!isFinite(sc)||sc<=0) sc=0.5; sc=Math.min(sc,1.15);
    el.style.transform='scale('+sc+')';
  }

  renderVals(){
    const s=this.state;
    const isPortrait = s.orientation==='portrait';
    let scrubTime='0:00';
    let timeNow='0:00', timeDur='0:00';
    { const dur = (this.videoEl && this.videoEl.duration) ? this.videoEl.duration : 0; const t=(s.scrubPct/100)*dur; const mm=Math.floor(t/60), ss=Math.floor(t%60); scrubTime = mm+':'+(ss<10?'0':'')+ss;
      const cur=(this.videoEl && isFinite(this.videoEl.currentTime))?this.videoEl.currentTime:0; const cm=Math.floor(cur/60), cs=Math.floor(cur%60); timeNow=cm+':'+(cs<10?'0':'')+cs;
      const dm=Math.floor(dur/60), ds=Math.floor(dur%60); timeDur=dm+':'+(ds<10?'0':'')+ds; }
    const panelInfo = isPortrait && s.panel==='info';
    const panelIG = isPortrait && s.panel==='ig';
    const panelNone = isPortrait && s.panel==='none';

    const tabActive={bg:'#fff',color:'#101013',border:'#fff'};
    const tabIdle={bg:'rgba(255,255,255,.08)',color:'#fff',border:'rgba(255,255,255,.16)'};
    const ti = s.panel==='info' ? tabActive : tabIdle;

    const segA={bg:'rgba(255,255,255,.16)',color:'#fff'};
    const segI={bg:'transparent',color:'rgba(255,255,255,.5)'};
    const sv = s.elModule==='vote'?segA:segI;
    const sa = s.elModule==='about'?segA:segI;
    const sm = s.elModule==='music'?segA:segI;

    const oA={bg:'#fff',color:'#111'}; const oI={bg:'transparent',color:'rgba(255,255,255,.6)'};
    const op = isPortrait?oA:oI; const ol = !isPortrait?oA:oI;

    // ---- Dance Your Style live data ----
    const seg = this.SEGMENTS[s.curSeg];
    const dur0 = (this.videoEl && this.videoEl.duration) ? this.videoEl.duration : 364;
    const segEnd = s.curSeg<this.SEGMENTS.length-1 ? this.SEGMENTS[s.curSeg+1].t : dur0;
    const curT = (this.videoEl && isFinite(this.videoEl.currentTime)) ? this.videoEl.currentTime : 0;
    const mmssL=(t)=>{ t=Math.max(0,Math.round(t)); const m=Math.floor(t/60), ss=t%60; return m+':'+(ss<10?'0':'')+ss; };
    const initials=(n)=>n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

    const cardSel = s.voted!==null ? s.voted : s.voteSel;
    const mkVote=(i, name, sub, ini, placeholder)=>{
      const sel = cardSel===i;
      return {
        idx:i, name, sub, initials:ini,
        bg: sel ? 'rgba(219,6,64,.16)' : 'rgba(255,255,255,.05)',
        border: sel ? 'rgba(219,6,64,.65)' : 'rgba(255,255,255,.14)',
        ring: sel ? '#DB0640' : 'rgba(255,255,255,.35)',
        dot: sel ? '#DB0640' : 'transparent',
        avatarBorder: placeholder ? '1px dashed rgba(255,255,255,.35)' : '1px solid rgba(255,255,255,.22)',
        avatarColor: placeholder ? 'rgba(255,255,255,.45)' : '#fff'
      };
    };
    const voteCards=[
      mkVote(0, seg.dancer, 'Now performing · '+seg.track, initials(seg.dancer), false),
      mkVote(1, 'Opponent · TBD', 'Battle details coming soon', '?', true)
    ];
    const castReady = s.voteSel!==null;
    const votedName = s.voted!==null ? (s.voted===0 ? seg.dancer : 'Opponent · TBD') : '';
    const segPct = Math.max(0, Math.min(100, ((curT-seg.t)/Math.max(1,(segEnd-seg.t)))*100)).toFixed(1)+'%';
    const setList = this.SEGMENTS.map((x,i)=>({
      idx:i, time:mmssL(x.t), dancer:x.dancer, track:x.track, artist:x.artist,
      now: i===s.curSeg,
      bg: i===s.curSeg ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.05)',
      border: i===s.curSeg ? 'rgba(255,255,255,.42)' : 'rgba(255,255,255,.1)',
      timeColor: i===s.curSeg ? '#fff' : 'rgba(255,255,255,.5)'
    }));

    const hintText = isPortrait
      ? 'Tap the wand in the controls · the interactive panel opens below the player'
      : 'Tap the wand in the controls · the panel opens split beside the video';

    const fmt=this.props.format||'live-dvr';
    const isLD = fmt==='live-dvr';
    if(isLD){
      const behind=s.behindS>1;
      timeNow = behind ? ('−'+mmssL(s.behindS)) : 'LIVE';
      timeDur = '';
      const ratio=(s.scrubPct||0)/100;
      scrubTime = ratio>=0.65 ? 'LIVE' : ('−'+mmssL(this.DVR_W*(1-ratio/0.65)));
    } else if(fmt==='linear'){
      timeNow = '14:00';
      timeDur = '15:00';
    } else if(fmt==='live'){
      timeNow = '';
      timeDur = 'LIVE';
    }
    const elOk=this.elOk();
    const seekOk=this.seekOk();
    const lsSplit = !isPortrait && (s.lsPanel || s.squeeze==='stack');
    const badgeLive = fmt==='live-dvr'||fmt==='live';
    const badgeText = badgeLive ? 'LIVE' : (fmt==='vod' ? 'REPLAY' : 'CH 04 · RED BULL TV');
    return {
      badgeLive, badgeText, badgeShown: fmt!=='vod', pSeek: seekOk || fmt==='linear' || fmt==='live',
      nextTabShown: fmt==='linear', igTabAvail: elOk,
      openNext: this.openNext, lsNext: this.lsNext,
      panelNext: isPortrait && s.panel==='next',
      panelTabsShown: isPortrait && (s.panel==='info' || s.panel==='next'),
      cardNext: s.panel==='next', cardNextIdleShown: fmt==='linear' && s.panel!=='next',
      tabNextBg: (s.panel==='next'?'#fff':'rgba(255,255,255,.08)'), tabNextColor: (s.panel==='next'?'#101013':'#fff'), tabNextBorder: (s.panel==='next'?'#fff':'rgba(255,255,255,.16)'),
      upNext: [
        {time:'15:00', title:'Dance Your Style · World Final', sub:'Live from the arena'},
        {time:'16:30', title:'Behind the Battles', sub:'Backstage with the dancers'},
        {time:'18:15', title:'Best of Dance Your Style', sub:'Highlights & winners'}
      ],
      pMetaOp: (s.phase==='live' && isPortrait && s.panel==='none' && s.pControls && !s.scrubbing && !s.toast && !s.ad && !s.squeeze) ? '1' : '0',
      pMetaPe: (s.phase==='live' && isPortrait && s.panel==='none' && s.pControls && !s.scrubbing && !s.toast && !s.ad && !s.squeeze) ? 'auto' : 'none',
      goLive: this.goLive, goLiveShown: isLD && s.behindS>1,
      toastDesc: s.battle ? 'The battle is ending — cast your vote before the decision.' : 'Vote the battles, meet the dancers and follow the music — live.',
      igTabPlain: false, igTabBtn: elOk,
      rateInDur: '600ms',
      rateOutDur: '650ms',
      rootRef:this.rootRef, deviceRef:this.deviceRef, videoRef:this.videoRef,
      setPortrait:this.setPortrait, setLandscape:this.setLandscape,
      openInfo:this.openInfo, closePanel:this.closePanel,
      setVote:this.setVote, setAbout:this.setAbout, setMusic:this.setMusic,
      togglePlay:this.togglePlay, back10:this.back10, fwd10:this.fwd10,
      onVoteSel:this.onVoteSel, castVote:this.castVote, changeVote:this.changeVote, jumpSeg:this.jumpSeg,
      lsInfo:this.lsInfo, cardStartOver:this.cardStartOver, selCtrl:this.selCtrl,
      openELBtn:this.openELBtn,
      lsCardOpen: (!isPortrait && s.lsControls && (s.panel==='info'||s.panel==='next')),
      lsTabsIdle: (!isPortrait && s.lsControls && s.panel==='none' && !s.squeeze),
      lsShowTransport: (!isPortrait && s.lsControls && !s.scrubbing && s.panel==='none' && !s.toast && !s.ad && !s.squeeze),
      lsShowMeta: (!isPortrait && s.lsControls && !s.scrubbing && s.panel==='none' && !s.toast && !s.ad && !s.squeeze),

      ccBg: s.ctrlSel==='cc' ? '#fff' : 'rgba(28,28,32,.5)', ccColor: s.ctrlSel==='cc' ? '#101013' : '#fff',
      audioBg: s.ctrlSel==='audio' ? '#fff' : 'rgba(28,28,32,.5)', audioColor: s.ctrlSel==='audio' ? '#101013' : '#fff',
      settingsBg: s.ctrlSel==='settings' ? '#fff' : 'rgba(28,28,32,.5)', settingsColor: s.ctrlSel==='settings' ? '#101013' : '#fff',
      ctrlSel: s.ctrlSel,
      ccSel: s.ctrlSel==='cc', audioSel: s.ctrlSel==='audio', settingsSel: s.ctrlSel==='settings',
      ccIdle: s.ctrlSel!=='cc', audioIdle: s.ctrlSel!=='audio', settingsIdle: s.ctrlSel!=='settings',
      toastOpen: s.toast, adOpen: s.ad, adCount: s.adCount, adModalOpen: s.adModal,
      adRingOffset: (72.26*(8-s.adCount)/8).toFixed(2),
      acceptToast: ()=>this.acceptToast(), dismissToast: ()=>this.dismissToast(), closeAd: ()=>this.closeAd(),
      sendPhone: ()=>this.sendPhone(), closeModal: ()=>this.closeModal(),
      openAdSheet: ()=>this.openAdSheet(),
      adSkipTap: ()=>this.adSkipTap(),
      adSkipOp: s.adCount<=5 ? '1' : '.45',
      adSkipPe: s.adCount<=5 ? 'auto' : 'none',
      adSkipBtnBg: s.adCount<=5 ? '#fff' : 'linear-gradient(155deg, rgba(255,255,255,.16), rgba(255,255,255,.06) 55%, rgba(255,255,255,.1))',
      adSkipBtnBorder: s.adCount<=5 ? '#fff' : 'rgba(255,255,255,.24)',
      adSkipBtnColor: s.adCount<=5 ? '#101013' : '#fff',
      adRingTrack: s.adCount<=5 ? 'rgba(16,16,19,.15)' : 'rgba(255,255,255,.18)',
      adRingFill: s.adCount<=5 ? '#101013' : 'rgba(255,255,255,.9)',
      adNumColor: s.adCount<=5 ? '#101013' : '#fff',
      adClock: '0:0'+Math.max(0, Math.min(9, s.adCount)),
      adVideoRef: this.adVideoRef,
      sqVideoRef: this.sqVideoRef,
      sqStackOpen: s.squeeze==='stack',
      sqBannerOpen: s.squeeze==='banner',
      squeezeCount: s.squeezeCount,
      menuOpen: !!s.ctrlSel, openMore: this.openMore,
      menuTitle: s.ctrlSel==='more' ? 'SETTINGS' : (s.ctrlSel ? this.MENUS[s.ctrlSel].title : ''),
      chooseMenu: this.chooseMenu, closeMenu: this.closeMenu,
      menuOptions: s.ctrlSel==='more'
        ? [{idx:0,label:'Subtitles',sel:false,idle:true},{idx:1,label:'Audio',sel:false,idle:true},{idx:2,label:'Playback & quality',sel:false,idle:true}]
        : (s.ctrlSel ? this.MENUS[s.ctrlSel].opts.map((o,i)=>{ const sel=(s.menuChoice[s.ctrlSel]||0)===i; return { idx:i, label:o, sel:sel, idle:!sel }; }) : []),
      cardInfo: s.panel==='info', cardInfoIdle: s.panel!=='info',

      isPortrait, isLandscape:!isPortrait,
      showOrientToggle: !this.props.hosted,
      vLeft: lsSplit ? '16px' : '50%',
      vTf: lsSplit ? 'translateY(-50%)' : 'translate(-50%,-50%)',
      vH: lsSplit ? 'auto' : '100%',
      vW: lsSplit ? '56%' : 'auto',
      vR: lsSplit ? '12px' : '0px',
      lsPanelW: '40%',
      lsPanelBg: '#0d0d10',
      devW: isPortrait ? 390 : 844, devH: isPortrait ? 844 : 390, devScale: s.scale,

      isLive: s.phase==='live',
      scrubbing: s.scrubbing, showTransport: (s.phase==='live' && !s.scrubbing && !s.toast && !s.ad && !s.squeeze && (s.pControls || s.panel!=='none')), scrubDown: this.scrubDown,
      pTap: this.pTap,
      ratingShow: true, ratingIn: (s.ratingPhase==='in'), ratingOutP: (s.ratingPhase==='out'),

      scrubLeft: fmt==='live' ? '100%' : ((isLD && !s.scrubbing) ? (65*(1-s.behindS/this.DVR_W)).toFixed(1)+'%' : (s.scrubPct||0).toFixed(1)+'%'),
      scrubTime: scrubTime, timeNow: timeNow, timeDur: timeDur,
      liveMarkShown: isLD,
      toggleVol: this.toggleVol, volDown: this.volDown, volOpen: s.volOpen,
      volW: s.volOpen ? '108px' : '0px', volOp: s.volOpen ? 1 : 0, volLeft: (s.volPct||0).toFixed(1)+'%',
      lsTap: this.lsTap, lsShowChrome: (!isPortrait && s.lsControls && !s.scrubbing && !s.toast && !s.ad && !s.squeeze),
      lsShowScrub: (!isPortrait && s.panel==='none' && !s.squeeze && (s.lsControls || s.scrubbing) && !s.toast && !s.ad && (seekOk || fmt==='linear' || fmt==='live')), lsControlsHidden: (!isPortrait && !s.lsControls),
      trackColor: s.scrubbing ? 'rgba(255,255,255,.42)' : 'rgba(255,255,255,.3)',
      fillColor: s.scrubbing ? '#ffffff' : 'rgba(255,255,255,.6)',
      trackH: s.scrubbing ? '6px' : '4px',
      knobSize: s.scrubbing ? '15px' : '11px',
      knobColor: s.scrubbing ? '#ffffff' : 'rgba(255,255,255,.8)',
      seekTimeColor: s.scrubbing ? '#ffffff' : 'rgba(255,255,255,.7)',
      panelNone, panelInfo, panelIG, panelOpen: isPortrait && s.panel!=='none',
      pMeta: (s.phase==='live' && isPortrait && s.panel==='none' && (s.pControls||s.scrubbing) && !s.toast && !s.ad && !s.squeeze),
      pMetaText: (s.phase==='live' && isPortrait && s.panel==='none' && s.pControls && !s.scrubbing && !s.toast && !s.ad && !s.squeeze),
      playing:s.playing, paused:!s.playing,
      mVote:s.elModule==='vote', mAbout:s.elModule==='about', mMusic:s.elModule==='music',
      voteFormShown: s.voted===null,
      voteDoneShown: s.voted!==null,
      voteCards, votedName,
      castBg: castReady ? '#DB0640' : 'rgba(255,255,255,.08)',
      castColor: '#fff',
      castOp: castReady ? '1' : '.45',
      aboutInitials: initials(seg.dancer),
      aboutName: seg.dancer,
      aboutBio: this.BIOS[seg.dancer]||'Competing in the Red Bull Dance Your Style USA Qualifier.',
      aboutWindow: mmssL(seg.t)+' – '+mmssL(segEnd),
      musicTrack: seg.track,
      musicArtist: seg.artist,
      musicPct: segPct,
      setList,
      lsPanelOpen: (!isPortrait && s.lsPanel),
      closeLsPanel: this.closeLsPanel,
      skipShown: (s.skipOn && s.phase==='live' && !s.toast && !s.ad && !s.squeeze),
      skipTap: this.skipTap,
      toastKicker: s.battle ? 'EASE LIVE · FAN VOTE' : 'EASE LIVE',
      toastKickerLs: s.battle ? 'EASE LIVE · FAN VOTE' : 'EASE LIVE · DANCE YOUR STYLE',
      toastTitle: s.battle ? 'Vote for the battle winner' : 'Interactive content available',
      toastAcceptLabel: s.battle ? 'Vote now' : 'Open now',

      titleText:'Red Bull Dance Your Style',

      tabInfoBg:ti.bg, tabInfoColor:ti.color, tabInfoBorder:ti.border,
      segVoteBg:sv.bg, segVoteColor:sv.color, segAboutBg:sa.bg, segAboutColor:sa.color, segMusicBg:sm.bg, segMusicColor:sm.color,
      oPortBg:op.bg, oPortColor:op.color, oLandBg:ol.bg, oLandColor:ol.color,
      hintText
    };
  }
}
