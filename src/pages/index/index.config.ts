export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '小兔快跑',
      navigationBarBackgroundColor: '#FF6B35',
      navigationBarTextStyle: 'white'
    })
  : {
      navigationBarTitleText: '小兔快跑',
      navigationBarBackgroundColor: '#FF6B35',
      navigationBarTextStyle: 'white'
    }
