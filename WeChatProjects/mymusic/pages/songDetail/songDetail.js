// pages/songDetail/songDetail.js
import request from "../../utils/request";
import requestDB from "../../utils/requestDB"
//引入页面间通信的包
import PubSub from "pubsub-js";
import moment from "moment";

//获取全局实例
const appInstance = getApp();
const userInfo = appInstance.globalData.userInfo
let currentSong = {}
Page({

  /**
   * 页面的初始数据
   */
  data: {
    isPlay: false,//音乐是否播放
    song: {},//歌曲详情对象
    musicId: '',//音乐ID
    musicLink: '',//音乐播放链接
    currentTime: '00:00',//实时时间
    durationTime: '00:00',//总时长
    currentWidth: 0,//实时进度条的宽度
    isShowConfirm: false,
    momentContent: "",// 分享歌曲的文字内容
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const duration = moment.duration(299704);  // 创建一个Moment.js的duration对象
    const formattedTime = moment.utc(duration.as('milliseconds')).format('mm:ss');  // 格式化为"mm:ss"格式    
    console.log(moment(65).format('mm:ss'))
    //options:用于接收路由跳转的query参数
    //原生小程序中路由传参，对参数的长度有限制，如果参数超过长度会自动截取掉
    let musicId = options.musicId
    this.setData({
      musicId
    })
    //获取音乐详情
    this.getMusicInfo(musicId);

    //判断当前页面音乐是否在播放
    if (appInstance.globalData.isMusicPlay && appInstance.globalData.musicId === musicId) {
      //修改当前页面音乐播放状态
      this.setData({
        isPlay: true
      })
    }

    //创建控制音乐播放的实例对象
    this.backgroundAudioManager = wx.getBackgroundAudioManager();
    //监视音乐播放/暂停/停止
    this.backgroundAudioManager.onPlay(() => {
      this.changePlayState(true);
      //修改全局音乐播放播放状态
      appInstance.globalData.musicId = musicId;
    });
    this.backgroundAudioManager.onPause(() => {
      this.changePlayState(false);
    });
    this.backgroundAudioManager.onStop(() => {
      this.changePlayState(false);
    });

    //监听音乐实时播放的进度
    this.backgroundAudioManager.onTimeUpdate(() => {
      // console.log(this.backgroundAudioManager.currentTime)
      let currentTime = moment(this.backgroundAudioManager.currentTime * 1000).format('mm:ss')
      let currentWidth = this.backgroundAudioManager.currentTime / this.backgroundAudioManager.duration * 450;
      this.setData({
        currentTime,
        currentWidth
      })
    });

    //监听音乐播放自然结束
    this.backgroundAudioManager.onEnded(() => {
      //自动切换下一首音乐，并且自动播放
      PubSub.publish('switchType', 'next')
      //将实时播放进度条还原成0
      this.setData({
        currentWidth: 0,
        currentTime: '00:00'
      })
    })
  },

  // 显示歌单列表的 Mode
  showAddSongMode() {
    this.setData({
      isShowConfirm: true
    })
  },
  // 歌曲更多操作的 Tip
  showMoreMode() {
    let that = this
    wx.showActionSheet({
      itemList: ['添加到歌单', '分享到社区'],
      success (res) {
        console.log(res.tapIndex)
        switch (res.tapIndex) {
          case 0:
            that.showAddSongMode();
            break
          case 1:
            that.showInputContent();
            break
          case 2:
            break
        }
      },
      fail (res) {
        console.log(res.errMsg)
      }
    })
  },

  sendMoment(){
    let content = this.data.momentContent
    this.shareMoment(content)
    console.log(content)
  },

  shareMoment(content) {
    let moment = {}
    moment.userId = userInfo.userId
    moment.username = userInfo.username
    moment.avatarUrl = userInfo.avatarUrl
    moment.content = content
    moment.songId = currentSong.id
    moment.songTitle = currentSong.name
    moment.songAuthor = currentSong.ar[0].name
    moment.songImgUrl = currentSong.al.picUrl
    appInstance.addMoment(moment).then(b=>{
      this.cancel()
      console.log(b)
    })
  },

  // 添加歌曲到歌单的异步请求
  async addSong(e) {
    let {songlist} = e.detail
    let songListId = songlist.songListId
    let userId = userInfo.userId
    let songId = currentSong.id
    let songTitle = currentSong.name
    let songAuthor = currentSong.ar[0].name
    let songImgUrl = currentSong.al.picUrl
    let result = await requestDB('/addSongServlet', {songListId,userId,songId,songTitle,songAuthor,songImgUrl}).then()
    this.cancel()
    if(result.statusCode = 200) {
      wx.showToast({
        title: '添加成功',
        icon: 'success'
      })
    }
  },

  // 获取用户输入的值
  setValue(e) {
    this.setData({
      momentContent: e.detail.value
    })
  },

  showInputContent() {
    this.setData({
      isShowMode: true
    })
  },

   // 添加歌单Model，取消的回调
   cancel() {
    this.setData({
      isShowConfirm: false,
      isShowMode: false
    })
  },

  //修改播放状态的功能函数
  changePlayState(isPlay) {
    this.setData({
      isPlay
    })
    //修改全局音乐播放播放状态
    appInstance.globalData.isMusicPlay = isPlay;
  },

  //获取音乐详情的功能函数
  async getMusicInfo(musicId) {
    let songData = await request('/song/detail', {ids: musicId});
    //获取格式化歌曲时长
    const duration = moment.duration(songData.songs[0].dt);
    let durationTime = moment.utc(duration.as('milliseconds')).format('mm:ss');
    // let durationTime = moment(songData.songs[0].dt).format('mm:ss');
    currentSong = songData.songs[0]
    this.setData({
      song: songData.songs[0],
      durationTime
    })
    //动态修改窗口标题
    wx.setNavigationBarTitle({
      title: this.data.song.name
    })
  },

  //点击播放或暂停的回调
  handleMusicPlay() {
    let isPlay = !this.data.isPlay;
    let {musicId, musicLink} = this.data;
    this.musicControl(isPlay, musicId, musicLink);
  },

  //控制音乐播放和暂停的功能函数
  async musicControl(isPlay, musicId, musicLink) {

    if (isPlay) {//音乐播放
      if (!musicLink) {
        //获取音乐播放链接
        let musicLinkData = await request('/song/url', {id: musicId});
        musicLink = musicLinkData.data[0].url;
        this.setData({
          musicLink
        })
      }
      this.backgroundAudioManager.src = musicLink;
      this.backgroundAudioManager.title = this.data.song.name
    } else {//暂停音乐
      this.backgroundAudioManager.pause()
    }
  },

  //点击切歌的回调
  handleSwitch(event) {
    let type = event.currentTarget.id;
    //关闭当前播放的音乐
    this.backgroundAudioManager.stop();
    //订阅来自recommendSong页面发布的musicId消息
    PubSub.subscribe('musicId', (msg, musicId) => {
      //获取音乐详情信息
      this.getMusicInfo(musicId);
      //自动播放当前音乐
      this.musicControl(true, musicId);
      //取消订阅
      PubSub.unsubscribe('musicId')
    })
    //发布消息数据给recommendSong页面
    PubSub.publish('switchType', type);
  },


  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  onShareTimeline() {
    return {
      title: userInfo.username+'在音乐应用分享了一首歌曲，'+currentSong.name,
      imageUrl: currentSong.al.picUrl, // 图片 URL
      query: 'a=1&b=2'
    }
  }
})