/**
 说明: 登录流程
 1. 收集表单项数据
 2. 前端验证
 1) 验证用户信息(账号，密码)是否合法
 2) 前端验证不通过就提示用户，不需要发请求给后端
 3) 前端验证通过了，发请求(携带账号, 密码)给服务器端
 3. 后端验证
 1) 验证用户是否存在
 2) 用户不存在直接返回，告诉前端用户不存在
 3) 用户存在需要验证密码是否正确
 4) 密码不正确返回给前端提示密码不正确
 5) 密码正确返回给前端数据，提示用户登录成功(会携带用户的相关信息)
 */
import request from '../../utils/request'
import requestDB from '../../utils/requestDB';
let appInstance = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    username: '', // 手机号
    password: '' // 用户密码
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  },

  // 表单项内容发生改变的回调
  handleInput(event){
    // let type = event.currentTarget.id;// id传值 取值： phone || password
    let type = event.currentTarget.dataset.type; // data-key=value
    // console.log(event);
    this.setData({
      [type]: event.detail.value
    })
  },

  // 登录的回调
  async login(){
    // 1. 收集表单项数据
    let {username, password} = this.data;
    // 2. 前端验证
    if(!username){
      // 提示用户
      wx.showToast({
        title: '手机号不能为空',
        icon: 'error'
      })
      return;
    }
    if(!password){
      wx.showToast({
        title: '密码不能为空',
        icon: 'error'
      })
      return;
    }
    // mybatis测试
    // let result = await requestDB('/loginServlet', {username, password});
    // console.log(result)

    // 后端验证
    let result = await requestDB('/loginServlet', {username, password}).then()
    console.log(result)
    if(result.statusCode === 200){ // 登录成功
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
      // 将用户的信息存储至本地
      wx.setStorageSync('userInfo', JSON.stringify(result.data))
      appInstance.globalUpdateUserInfo()
      // 跳转至个人中心personal页面
      wx.reLaunch({
        url: '/pages/personal/personal'
      })
    }else if(result.statusCode === 400){
      wx.showToast({
        title: '手机号错误',
        icon: 'error'
      })
    }else if(result.statusCode === 502){
      wx.showToast({
        title: '密码错误',
        icon: 'error'
      })
    }else {
      wx.showToast({
        title: '登录失败，请重新登录',
        icon: 'error'
      })
    }
  },

  // 跳转至登录register页面的回调
  toRegister(){
    wx.navigateTo({
      url: '/pages/register/register'
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})
