export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '注册',
      navigationBarBackgroundColor: '#ffffff',
      navigationBarTextStyle: 'black'
    })
  : {
      navigationBarTitleText: '注册',
      navigationBarBackgroundColor: '#ffffff',
      navigationBarTextStyle: 'black'
    }
