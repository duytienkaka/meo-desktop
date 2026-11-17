(function(root){
 const common=[
  {id:'yarn',name:'Cuộn len',level:2},
  {id:'daisies',name:'Lọ cúc nhỏ',level:3},
  {id:'boat',name:'Thuyền gỗ',level:4}
 ];
 const rare=[
  {id:'bell',name:'Chuông nhỏ'},
  {id:'star',name:'Ngôi sao'},
  {id:'fish',name:'Cá gỗ'}
 ];
 const catalogue={common,rare};
 if(typeof module!=='undefined')module.exports=catalogue;
 else root.ROOM_KEEPSAKES=catalogue;
})(typeof window==='undefined'?globalThis:window);
