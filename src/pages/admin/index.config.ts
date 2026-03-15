export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '后台管理',
      navigationBarBackgroundColor: '#1E88E5',
      navigationBarTextStyle: 'white'
    })
  : {
      navigationBarTitleText: '后台管理',
      navigationBarBackgroundColor: '#1E88E5',
      navigationBarTextStyle: 'white'
    }
