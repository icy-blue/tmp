//植物的基类
var CPlants=NewO({name:'Plants',
	HP:300,PKind:1,beAttackedPointL:20,
	CardGif:0,
	StaticGif:1,
	NormalGif:2,
	BookHandBack:0, //图鉴背景的索引,Almanac_Ground.jpg
	canEat:1,zIndex:0,
	AudioArr:[], //html5专用，植物需要用到的音频
	coolTime:7.5,
	CanSelect:1, //卡片可以选择
	canTrigger:1, //默认触发器能够被触发，蘑菇类白天睡眠时不触发
	Stature:0, //-1矮小 0普通身材 1高大身材不能被跳跃
	Sleep:0, //是否睡眠
	CanGrow:function(AP,R,C){ //判断能否种植
		var S=R+'_'+C,ArP=oS.ArP;
		return ArP?
			oGd.$LF[R]==1?(C>0&&C<ArP.ArC[1]&&!(oGd.$Crater[S]||oGd.$Tombstones[S]||AP[1])):AP[0]&&!AP[1]
			:oGd.$LF[R]==1?!(C<1||C>9||oGd.$Crater[S]||oGd.$Tombstones[S]||AP[1]):AP[0]&&!AP[1];
			//草地，若范围超出或有弹坑墓地或有普通植物，false；其他类型，必须有容器和无普通植物
	},
	getHurt:function(o,AKind,Attack){ //植物受攻击函数，传递僵尸对象，攻击类型，攻击力作为参数
		//Akind:0直接啃食，1巨人是秒杀，2篮球车冰车碾压，3篮球车丢篮球,以及其他远程
		var p=this,pid=p.id;
		!(AKind%3)?(p.HP-=Attack)<1&&p.Die():p.Die();
	},
	//被车子僵尸碾压
	getCrushed:function(z){this.Die()},
	GetDY:function(R,C,AP){return AP[0]?-21:-15}, //GetDeviationY，返回纵坐标偏移
	GetDX:function(){return -Math.floor(this.width*.5)}, //普通植物X坐标距离格子中点偏移量为宽度一半
	GetDTop:0,
	GetDBottom:function(){return this.height}, //植物实际底部跟pixelTop的偏移，实际底部和pixelTop用于判断鼠标是否在植物上，通常是返回植物本身高度，咖啡豆是例外
	Birth:function(X,Y,R,C,AP,arg){ //传递植物X坐标中点，底部Y坐标，行，列，该格子已经存在的植物数组，自定义参数（非必要，个别植物需要用，比如土豆雷）
		var o=this,pixelLeft=X+o.GetDX(),DY=Y+o.GetDY(R,C,AP),pro=o.prototype,pixelTop=DY-o.height,id=o.id='P_'+Math.random(),zIndex=o.zIndex+=3*R,
			//Pn=$Pn[o.EName].cloneNode(true);
			Pn=NewEle(0,'div','position:absolute');
		NewImg(0,ShadowPNG,o.getShadow(o),Pn);
		NewImg(0,o.PicArr[o.NormalGif],'',Pn);
		o.pixelLeft=pixelLeft;
		o.pixelRight=pixelLeft+o.width;
		o.pixelTop=pixelTop;
		o.pixelBottom=pixelTop+o.GetDBottom();
		o.opacity=1;
		o.InitTrigger(o,id,o.R=R,o.C=C,o.AttackedLX=pixelLeft+o.beAttackedPointL,o.AttackedRX=pixelLeft+o.beAttackedPointR); //初始化触发器
		$P[id]=o; //存入索引数组
		$P.length+=1; //植物数量加1
		o.BirthStyle(o,id,Pn,{left:pixelLeft+'px',top:pixelTop+'px',zIndex:zIndex},arg); //出生图片位置等设置
		oGd.add(o,R+'_'+C+'_'+o.PKind); //添加对象到场地对象的植物索引数组中
		o.PrivateBirth(o,arg);
	},
	getShadow:function(o){return 'left:'+(o.width*0.5-48)+'px;top:'+(o.height-22)+'px'}, //用于初始化模板时返回影子样式
	BirthStyle:function(P,id,Pn,json){EditEle(Pn,{id:id},json,EDPZ)}, //设置出生模板的style。蘑菇类会根据白天黑夜来判断
	PrivateBirth:function(o){}, //植物各自私有的出生函数，公用Birth里调用
	getTriggerRange:function(R,LX,RX){return [[LX,oS.W,0]]}, //返回在本行的触发器范围//豌豆射手触发射程是本行LX-900，方向是0－右
	getTriggerR:function(R){return [R,R]}, //传递行返回触发器行上下限,返回格式是[下限，上限]
	InitTrigger:function(o,id,R,C,LX,RX){
		//触发器格式{2:[[1,100,0],[120,220,0]],3:[[1,100,0]]}
		var t={},aTri=o.getTriggerR(R),R1=aTri[0],R2=aTri[1];
		do{oT.add(R1,t[R1]=o.getTriggerRange(R1,LX,RX),id)}while(R1++!=R2); //传递行，行触发器范围数组，植物id
		o.oTrigger=t; //触发器对象
	},
	TriggerCheck:function(o,d){ //传递一个僵尸对象进行触发器触发条件检查，由触发器触发，不检查僵尸坐标范围。d是触发方向
		this.AttackCheck2(o)&&(this.canTrigger=0,this.CheckLoop(o.id,d));
	},
	CheckLoop:function(zid,d){ //开始攻击，并且循环检查攻击条件1,2
		var pid=this.id;
		this.NormalAttack(zid);
		oSym.addTask(140,function(pid,zid,d){var p;(p=$P[pid])&&p.AttackCheck1(zid,d)},[pid,zid,d]);
	},
	AttackCheck1:function(zid,d){ //传递僵尸id和触发器方向再次检测是否符合攻击条件
		var o=this,T=o.oTrigger,Z=$Z[zid],rT,i,ZX,iT;
		if(Z&&Z.PZ&&(rT=T[Z.R])){
			ZX=Z.ZX;
			i=rT.length;
			while(i--){
				iT=rT[i];
				if(iT[0]<=ZX&&iT[1]>=ZX&&o.AttackCheck2(Z)){o.CheckLoop(zid,iT[2]);return;}
			}
		}
		o.canTrigger=1;
	},
	AttackCheck2:function(o){var a=o.Altitude;return a==1||a==2}, //检查攻击判定条件2，一般是行走或者跳跃即可攻击
	PrivateDie:function(o){},
	//被小丑的爆炸秒杀
	BoomDie:function(){
		var o=this,id=o.id;
		o.oTrigger&&oT.delP(o); //删除触发器
		o.HP=0;
		delete $P[id];
		delete oGd.$[o.R+'_'+o.C+'_'+o.PKind];
		$P.length-=1; 
		ClearChild($(id)); //当不传递参数时直接移除图片，传递1表示图片移除由外界函数执行
		o.PrivateDie(o);
	},
	Die:function(delP){
		var o=this,id=o.id;
		o.oTrigger&&oT.delP(o); //删除触发器
		o.HP=0;
		delete $P[id];
		delete oGd.$[o.R+'_'+o.C+'_'+o.PKind];
		$P.length-=1; 
		!delP&&ClearChild($(id)); //当不传递参数时直接移除图片，传递1表示图片移除由外界函数执行
		o.PrivateDie(o); //私有死亡事件
	}
}),

//玉米卷
oTaco=InheritO(CPlants,{
	EName:'oTaco',CName:'玉米卷',StaticGif:0,width:80,height:80,PicArr:['images/interface/Taco.png'],Tooltip:'你准备拿这个玉米卷做什么呢？'
}),

//铁铲
oShovel=InheritO(CPlants,{
	EName:'oShovel',CName:'铁铲',StaticGif:0,width:76,height:34,PicArr:['images/interface/Shovel.png'],Tooltip:'让你挖出一株植物，腾出空间给其他植物'
}),

//图鉴
oAlmanac=InheritO(CPlants,{
	EName:'oAlmanac',CName:'图鉴',StaticGif:0,width:69,height:72,PicArr:['images/interface/Almanac.png'],Tooltip:'记载所有你遇到的植物和僵尸'
}),

//僵尸的通知1
oZombieNote1=InheritO(CPlants,{
	EName:'oZombieNote1',CName:'僵尸的通知1',width:78,height:52,PicArr:['images/interface/ZombieNoteSmall.png','images/interface/ZombieNote1.png']
}),

//僵尸的通知2
oZombieNote2=InheritO(oZombieNote1,{
	EName:'oZombieNote2',CName:'僵尸的通知2',PicArr:['images/interface/ZombieNoteSmall.png','images/interface/ZombieNote2.png']
}),

//僵尸的通知3
oZombieNote3=InheritO(oZombieNote1,{
	EName:'oZombieNote3',CName:'僵尸的通知3',PicArr:['images/interface/ZombieNoteSmall.png','images/interface/ZombieNote3.png']
}),

//戴夫的车钥匙
oKeys=InheritO(CPlants,{
	EName:'oKeys',CName:'疯狂戴夫的车钥匙',StaticGif:0,width:69,height:69,PicArr:['images/interface/CarKeys.png','images/interface/ZombieNote2.png'],Tooltip:'现在你可以访问疯狂戴夫的商店！'
}),

//墓地苔
oGraveBuster=InheritO(CPlants,{
	EName:'oGraveBuster',CName:'墓地苔',width:99,height:106,beAttackedPointR:70,SunNum:75,
	BookHandBack:2,
	PicArr:['images/Card/Plants/GraveBuster.png','images/Plants/GraveBuster/0.gif','images/Plants/GraveBuster/GraveBuster.gif'+$Random+Math.random()],
	AudioArr:['gravebusterchomp'],
	CanGrow:function(AP,R,C){ //判断能否种植
		var ArP=oS.ArP;
		return ArP?
			C>0&&C<ArP.ArC[1]&&(R+'_'+C in oGd.$Tombstones&&!AP[1])
			:R+'_'+C in oGd.$Tombstones&&!AP[1] //必须种植在墓碑上且无普通植物
	},
	getShadow:function(o){return 'left:'+(o.width*0.5-48)+'px;top:'+(o.height)+'px'},
	BirthStyle:function(P,id,Pn,json){
		//Pn.childNodes[1].src='images/Plants/GraveBuster/GraveBuster.gif'+$Random+Math.random();
		EditEle(Pn,{id:id},json,EDPZ)
	},
	GetDY:function(R,C,AP){return -30},
	InitTrigger:function(){},
	Tooltip:'把它种在墓碑上用来吞噬墓碑',
	Produce:'墓地苔用来吃掉墓碑。<p>使用方法：<font color="#FF0000">单次使用，只对墓碑生效。</font><br>特点：<font color="#FF0000">吞噬墓碑。</font></p>尽管墓地苔的外表十分吓人，但他想要所有人都知道，其实他喜欢小猫咪，而且利用业余时间，在一家僵尸康复中心做志愿者。“我只是在做正确的事情，”他说。',
	PrivateBirth:function(o){
		PlayAudio('gravebusterchomp');
		oSym.addTask(420,function(pid){
			var p=$P[pid],S,R,C;
			p&&(
				R=p.R,C=p.C,
				delete oGd.$Tombstones[S=R+'_'+C],
				p.Die(),
				ClearChild($('dTombstones'+S)),
				oS.StaticCard&&AppearSun(Math.floor(GetX(C)+Math.random()*41),GetY(R),25,0)
				);
		},[o.id])
	}
}),

//草地剪草机
oLawnCleaner=InheritO(CPlants,{
	EName:'oLawnCleaner',CName:'草地剪草机',width:71,height:57,beAttackedPointL:0,beAttackedPointR:71,SunNum:0,
	PicArr:['images/interface/LawnCleaner.png'],
	AudioArr:['lawnmower'],
	NormalGif:0,
	canEat:0,Stature:1, //不可逾越
	getTriggerRange:function(R,LX,RX){return [[LX,RX,0]]},
	TriggerCheck:function(o,d){ //传递一个僵尸对象进行触发器触发条件检查，由触发器触发，不检查僵尸坐标范围。d是触发方向
		o.beAttacked&&o.Altitude>0&&(this.canTrigger=0,this.NormalAttack(this));
	},
	BoomDie:function(){}, //免疫小丑的爆炸
	Tooltip:'最普通的草地剪草机',
	NormalAttack:function(p){
		PlayAudio(p.AudioArr[0]);
		(function(p,W,AttackedLX,AttackedRX,R,img){
			var aZ=oZ.getArZ(AttackedLX,AttackedRX,R),i=aZ.length,tmpZ;
			while(i--)(tmpZ=aZ[i]).getCrushed(p)&&tmpZ.CrushDie();
			AttackedLX>W?
				p.Die()
				:(
					p.pixelRight+=10,
					p.AttackedLX=AttackedLX+=10,
					p.AttackedRX=AttackedRX+=10,
					img.style.left=(p.pixelLeft+=10)+'px',
					oSym.addTask(1,arguments.callee,[p,W,AttackedLX,AttackedRX,R,img])
				);
		})(p,oS.W,p.AttackedLX,p.AttackedRX,p.R,$(p.id));
	}
}),

//水池清理车
oPoolCleaner=InheritO(oLawnCleaner,{
	EName:'oPoolCleaner',CName:'池塘清扫车',width:47,height:64,beAttackedPointL:0,beAttackedPointR:47,SunNum:0,
	PicArr:['images/interface/PoolCleaner.png'],Tooltip:'池塘清扫车',
	AudioArr:['pool_cleaner']
}),

//脑子
oBrains=InheritO(CPlants,{
	EName:'oBrains',CName:'脑子',width:32,height:31,beAttackedPointL:0,beAttackedPointR:32,SunNum:0,
	PicArr:['images/interface/brain.png'],
	Tooltip:'美味的脑子',
	NormalGif:0,
	InitTrigger:function(){},
	PrivateBirth:function(o){
		o.PrivateDie=oS.BrainsNum?( //吃脑子的解谜模式中，脑子的死亡执行进度条的移动
			o.DieStep=Math.floor(150/oS.BrainsNum), //每吃掉一个脑子，进度条行进
			function(o){
				var FH,BrainsNum;
				AppearSun(Math.floor((GetX(o.C)-40)+Math.random()*41),GetY(o.R),50,0);
				(BrainsNum=--oS.BrainsNum)?( //脑子未全部吃完
					FH=BrainsNum*o.DieStep,
					$('imgFlagHead').style.left=(FH-11)+'px',
					$('imgFlagMeterFull').style.clip='rect(0,157px,21px,'+FH+'px)'
				):( //脑子全部被吃，游戏胜利
					$('imgFlagHead').style.left='-1px',
					$('imgFlagMeterFull').style.clip='rect(0,157px,21px,0)',
					oP.FlagToEnd() //胜利
				);
			}
		):function(o){GameOver()} //普通的游戏模式中，脑子的死亡执行游戏失败
	},
	GetDX:function(){return -40}
}),

//杨桃
oStarfruit=InheritO(CPlants,{
	EName:'oStarfruit',CName:'杨桃',width:77,height:70,beAttackedPointR:57,SunNum:125,GetDY:function(R,C,AP){return AP[0]?-17:-10},
	PicArr:['images/Card/Plants/Starfruit.png','images/Plants/Starfruit/0.gif','images/Plants/Starfruit/Starfruit.gif','images/Plants/Starfruit/Star.gif'],
	Tooltip:'向五个方向发射小杨桃',Produce:'杨桃可以向五个方向发射小杨桃。<p>伤害：<font color="#FF0000">中等</font><br>范围：<font color="#FF0000">五个方向</font></p>杨桃：“嘿，哥们，有一天我去看牙医，他说我有四个牙洞。我一数，我就只有一颗牙齿！一颗牙齿长了四个牙洞？怎么会这样啊？”',
	//ArFlyTime:{},ArHitX:{}, //保存飞行时间对象,能攻击的范围
	getTriggerRange:function(R,LX,RX){
		var r=this.R,GetYR=GetY(r),W=oS.W,ArFlyTime=this.ArFlyTime,ArHitX=this.ArHitX,x,MX=.5*(LX+RX);
		!ArFlyTime&&(
			ArFlyTime=this.ArFlyTime={},
			ArHitX=this.ArHitX={}
		);
		//保存子弹飞到各行所需时间，用以计算子弹飞行是否能击中僵尸
		//往左侧飞行的 子弹无需计算时间，往上下和右上右下的要计算
		//每行都有两个飞行时间，跟植物在一行无需计算直接攻击
		//30度飞行，纵向3横向4斜向5
		switch(true){
			case R<r: //正上方射程和右上方
				ArFlyTime[R]=[(x=GetYR-GetY(R))/5,x/3]; //保存向上的,右上的飞行时间
				//x=x/3*4;
				//if($P.length<1){ArHitX[R]=[MX,MX+x];}
				ArHitX[R]=[MX,MX+x/3*4];
				return [[100,W,0]];
			case R==r: //左方射程
				return([[100,LX+25,4]]);
			default: //正下方和右下方
				ArFlyTime[R]=[(x=GetY(R)-GetYR)/5,x/3]; //保存向下的,右下的飞行时间
				//x=x/3*4;
				//if($P.length<1){ArHitX[R]=[MX,MX+x];}
				ArHitX[R]=[MX,MX+x/3*4];
				return [[100,W,0]];
		}
	},
	/*AttackCheck1:function(zid){ //传递僵尸id和触发器方向再次检测是否符合攻击条件
		var o=this,T=o.oTrigger,Z=$Z[zid],i;
		if(Z&&Z.PZ){
			i=T[Z.R].length;
			while(i--)if(o.Altitude>0){o.CheckLoop(zid);return;}
		}
		o.canTrigger=1;
	},*/
	AttackCheck2:function(o){
		var R=o.R;
		if(R==this.R)return(o.Altitude>0);
		var i=0,LX=o.AttackedLX,RX=o.AttackedRX,NLX,NRX, //行，僵尸左右攻击点,新左右攻击点
			ArFlyTime=this.ArFlyTime,ArHitX=this.ArHitX, //飞行时间对象,击中范围对象
			ArT=ArFlyTime[R],ArX=ArHitX[R], //获取当前僵尸所在行的飞行对象数组,[a,b];当前行的攻击范围数组,[[a,b],[c,d]]
			WD=o.WalkDirection?-1:1, //行进方向
			CanAttacked=false, //标记是否可以攻击
			Ar,Ar0,Ar1,T,Speed=o.Speed; //行进速度
			while(i<ArT.length){
				T=Speed*ArT[i]*WD*.1; //当前飞行时间
				NLX=Math.floor(LX-T);NRX=Math.floor(RX-T); //计算出子弹飞行后僵尸预计的左右攻击点
				Ar0=ArX[0];Ar1=ArX[1];
				//僵尸进入攻击范围
				//if(!(NRX<Ar0||NLX>Ar1)){
				if(NLX+20<Ar0&&NRX-20>Ar0||NLX<Ar1&&NRX>Ar1){
					CanAttacked=true;
					break; //跳出循环判断
				}
				++i;
			}
			return(CanAttacked&&o.Altitude==1&&o.Altitude==2); //僵尸是否可以进入攻击范围以及僵尸是水平行进
	}, 
	getTriggerR:function(R){return [1,oS.R]}, //杨桃攻击行数是所有行
	PrivateBirth:function(o){
		var LX=o.pixelLeft+38,pixelLeft=LX-15,pixelTop=o.pixelTop+20;
		//子弹数据
		//o.BulletClass=NewO({X:LX,R:o.R,pixelLeft:pixelLeft,pixelTop:pixelTop,F:oGd.MB3});
		//子弹图片模板，默认隐藏
		o.BulletEle=NewImg(0,'images/Plants/Starfruit/Star.gif','left:'+pixelLeft+'px;top:'+pixelTop+'px;z-index:'+(o.zIndex+2));
	},
	PrivateDie:function(o){o.BulletEle=null}, //子弹图片清除
	getHurt:function(o,AKind,Attack){
		var p=this;
		AKind!=3&&p.NormalAttack(); //被近距离攻击就反击
		(p.HP-=Attack)<1&&p.Die();
	},
	NormalAttack:function(){
		var o=this,LX=o.pixelLeft+38,pixelLeft=LX-15,pixelTop=o.pixelTop+20,R=o.R,rx=LX+15,NotHit=function(Z,D,img){return(Z&&Z.Altitude==1?(Z.getPea(Z,20,D),ClearChild(img),false):true)};
		(function(id){ //方向是4，左
			oSym.addTask(15,function(id){var o=$(id);o&&SetVisible(o)},[id]);
			oSym.addTask(1,function(X,R,PLX,img,NotHit){
				NotHit(oZ.getZ1(X,R),4,img)&&((X-=5)<100?
					ClearChild(img):(
						img.style.left=(PLX-=5)+'px',
						oSym.addTask(1,arguments.callee,[X,R,PLX,img,NotHit])
					)
				);
			},[LX,R,pixelLeft,EditEle(o.BulletEle.cloneNode(false),{id:id},0,EDPZ),NotHit]);
		})('StarB'+Math.random());
		(function(id){ //6，上
			oSym.addTask(15,function(id){var o=$(id);o&&SetVisible(o)},[id]);
			oSym.addTask(1,function(LX,RX,R,pixelTop,img,NotHit){
				NotHit(oZ.getRangeLeftZ(LX,RX,R),6,img)&&((pixelTop-=5)<-15?
					ClearChild(img):(
						img.style.top=pixelTop+'px',
						oSym.addTask(1,arguments.callee,[LX,RX,GetR(pixelTop+15),pixelTop,img,NotHit])
					)
				);
			},[pixelLeft,rx,R,pixelTop,EditEle(o.BulletEle.cloneNode(false),{id:id},0,EDPZ),NotHit]);
		})('StarB'+Math.random());
		(function(id){ //2，下
			oSym.addTask(15,function(id){var o=$(id);o&&SetVisible(o)},[id]);
			oSym.addTask(1,function(LX,RX,R,pixelTop,img,NotHit){
				NotHit(oZ.getRangeLeftZ(LX,RX,R),2,img)&&((pixelTop+=5)>600?
					ClearChild(img):(
						img.style.top=pixelTop+'px',
						oSym.addTask(1,arguments.callee,[LX,RX,GetR(pixelTop+15),pixelTop,img,NotHit])
					)
				);
			},[pixelLeft,rx,R,pixelTop,EditEle(o.BulletEle.cloneNode(false),{id:id},0,EDPZ),NotHit]);
		})('StarB'+Math.random());
		(function(id){ //7，右上
			oSym.addTask(15,function(id){var o=$(id);o&&SetVisible(o)},[id]);
			oSym.addTask(1,function(LX,R,pixelLeft,pixelTop,img,NotHit){
				NotHit(oZ.getZ0(LX,R),7,img)&&((LX+=4)>900||(pixelTop-=3)<-15?
					ClearChild(img):(
						SetStyle(img,{'left':(pixelLeft+=4)+'px','top':pixelTop+'px'}),
						oSym.addTask(1,arguments.callee,[LX,GetR(pixelTop+15),pixelLeft,pixelTop,img,NotHit])
					)
				);
			},[LX,R,pixelLeft,pixelTop,EditEle(o.BulletEle.cloneNode(false),{id:id},0,EDPZ),NotHit]);
		})('StarB'+Math.random());
		(function(id){ //1，右下
			oSym.addTask(15,function(id){var o=$(id);o&&SetVisible(o)},[id]);
			oSym.addTask(1,function(LX,R,pixelLeft,pixelTop,img,NotHit){
				NotHit(oZ.getZ0(LX,R),1,img)&&((LX+=4)>900||(pixelTop+=3)>600?
					ClearChild(img):(
						SetStyle(img,{'left':(pixelLeft+=4)+'px','top':pixelTop+'px'}),
						oSym.addTask(1,arguments.callee,[LX,GetR(pixelTop+15),pixelLeft,pixelTop,img,NotHit])
					)
				);
			},[LX,R,pixelLeft,pixelTop,EditEle(o.BulletEle.cloneNode(false),{id:id},0,EDPZ),NotHit]);
		})('StarB'+Math.random());
	}
}),

//豌豆射手
oPeashooter=InheritO(CPlants,{
	EName:'oPeashooter',CName:'豌豆射手',width:71,height:71,beAttackedPointR:51,SunNum:100,BKind:0,
	AudioArr:['splat1','splat2','splat3','plastichit','shieldhit','shieldhit2'], //三个普通的击中声，一个击中路障和橄榄球，一个击中铁桶门板车子等
	PicArr:['images/Card/Plants/Peashooter.png','images/Plants/Peashooter/0.gif',
			'images/Plants/Peashooter/Peashooter.gif',
			'images/Plants/PB00.gif',
			'images/Plants/PeaBulletHit.gif'],
	Tooltip:'向敌人射出豌豆',Produce:'豌豆射手，你的第一道防线。它们通过发射豌豆来攻击僵尸。<p>伤害：<font color="#FF0000">中等</font></p>一棵植物，怎么能如此快地生长，并发射如此多的豌豆呢？豌豆射手：“努力工作，奉献自己，再加上一份阳光，高纤维和氧化碳均衡搭配，这种健康早餐让一切成为可能。”',
	PrivateBirth:function(o){ //出生时建立一个子弹图片，射击直接使用cloneNode//创建一个子弹对象，射击直接继承该对象
		o.BulletEle=NewImg(0,o.PicArr[3],'left:'+(o.AttackedLX-40)+'px;top:'+(o.pixelTop+3)+'px;visibility:hidden;z-index:'+(o.zIndex+2));
	},
	PrivateDie:function(o){o.BulletEle=null}, //清除子弹缓存
	NormalAttack:function(){
		var o=this,id='PB'+Math.random();
		EditEle(o.BulletEle.cloneNode(false),{id:id},0,EDPZ);
		oSym.addTask(15,function(id){var o=$(id);o&&SetVisible(o)},[id]);
		oSym.addTask(1,function(id,img,Attack,D,OX,R,Kind,ChangeC,pixelLeft,T){ //移动豌豆类子弹
			var side,C=GetC(OX),Z=oZ['getZ'+D](OX,R);
			Kind==0&&T[R+'_'+C]&&ChangeC!=C&&( //冰豌豆和普通豌豆飞过有火炬的格子，且在当前格子中是第一次变化（避免冰豌豆在一个格子就变成火豆）
				PlayAudio('firepea'),
				Kind=1,
				Attack=40,
				ChangeC=C,
				img.src='images/Plants/PB'+Kind+D+'.gif'
			);
			Z&&Z.Altitude==1?(
				Z[{'-1':'getSnowPea',0:'getPea',1:'getFirePea'}[Kind]](Z,Attack,D),
				(SetStyle(img,{left:pixelLeft+28+'px',width:'52px',height:'46px'})).src='images/Plants/PeaBulletHit.gif',
				oSym.addTask(10,ClearChild,[img])
			):(OX+=(side=!D?5:-5))<oS.W&&OX>100?(
				img.style.left=(pixelLeft+=side)+'px',
				oSym.addTask(1,arguments.callee,[id,img,Attack,D,OX,R,Kind,ChangeC,pixelLeft,T])
			):ClearChild(img);
		},[id,$(id),20,0,o.AttackedLX,o.R,0,0,o.AttackedLX-40,oGd.$Torch]);
	}
}),

//寒冰射手
oSnowPea=InheritO(oPeashooter,{
	EName:'oSnowPea',CName:'寒冰射手',SunNum:175,BKind:-1,
	PicArr:['images/Card/Plants/SnowPea.png','images/Plants/SnowPea/0.gif',
			'images/Plants/SnowPea/SnowPea.gif',
			'images/Plants/PB-10.gif',
			'images/Plants/PeaBulletHit.gif'],
	AudioArr:['frozen','splat1','splat2','splat3','shieldhit','shieldhit2','plastichit'],
	Tooltip:'寒冰射手可造成伤害, 同时又有减速效果',Produce:'寒冰射手会发射寒冰豌豆来攻击敌人，并具有减速效果。<p>伤害：<font color="#FF0000">中等，带有减速效果</font></p>人们经常告诉寒冰射手他是多么“冷酷”，或者告诫他要“冷静”。他们叫他要“保持镇静”。寒冰射手只是转转他的眼睛。其实他都听见了。',
	NormalAttack:function(){
		var o=this,id='PB'+Math.random();
		EditEle(o.BulletEle.cloneNode(false),{id:id},0,EDPZ);
		oSym.addTask(15,function(id){var o=$(id);o&&SetVisible(o)},[id]);
		oSym.addTask(1,function(id,img,Attack,D,OX,R,Kind,ChangeC,pixelLeft,T){ //移动豌豆类子弹
			var side,C=GetC(OX),Z=oZ['getZ'+D](OX,R);
			Kind<1&&T[R+'_'+C]&&ChangeC!=C&&( //冰豌豆和普通豌豆飞过有火炬的格子，且在当前格子中是第一次变化（避免冰豌豆在一个格子就变成火豆）
				PlayAudio('firepea'),
				++Kind&&(Attack=40),
				ChangeC=C,
				img.src='images/Plants/PB'+Kind+D+'.gif'
			);
			Z&&Z.Altitude==1?(
				Z[{'-1':'getSnowPea',0:'getPea',1:'getFirePea'}[Kind]](Z,Attack,D),
				(SetStyle(img,{left:pixelLeft+28+'px',width:'52px',height:'46px'})).src='images/Plants/PeaBulletHit.gif',
				oSym.addTask(10,ClearChild,[img])
			):(OX+=(side=!D?5:-5))<oS.W&&OX>100?(
				img.style.left=(pixelLeft+=side)+'px',
				oSym.addTask(1,arguments.callee,[id,img,Attack,D,OX,R,Kind,ChangeC,pixelLeft,T])
			):ClearChild(img);
		},[id,$(id),20,0,o.AttackedLX,o.R,-1,0,o.AttackedLX-40,oGd.$Torch]);
	}
}),

//双发射手
oRepeater=InheritO(oPeashooter,{
	EName:'oRepeater',CName:'双发射手',width:73,height:71,beAttackedPointR:53,SunNum:200,
	PicArr:['images/Card/Plants/Repeater.png','images/Plants/Repeater/0.gif',
			'images/Plants/Repeater/Repeater.gif',
			'images/Plants/PB00.gif',
			'images/Plants/PeaBulletHit.gif'],
	AudioArr:['splat1','splat2','splat3','plastichit','shieldhit','shieldhit2'],
	Tooltip:'一次发射两颗豌豆',Produce:'双发射手可以一次发射两颗豌豆<p>伤害：<font color="#FF0000">中等(每颗)</font><br>发射速度：<font color="#FF0000">两倍</font></p>双发射手很凶悍，他是在街头混大的。他不在乎任何人的看法，无论是植物还是僵尸，他打出豌豆，是为了让别人离他远点。其实呢，双发射手一直暗暗地渴望着爱情。',
	NormalAttack1:oPeashooter.prototype.NormalAttack,
	NormalAttack:function(zid){
		this.NormalAttack1();
		oSym.addTask(15,function(id){
			var p=$P[id];
			p&&p.NormalAttack1();
		},[this.id]);
	}
}),

//三线射手
oThreepeater=InheritO(oPeashooter,{
	EName:'oThreepeater',CName:'三线射手',width:73,height:80,beAttackedPointR:53,SunNum:325,
	PicArr:['images/Card/Plants/Threepeater.png','images/Plants/Threepeater/0.gif',
			'images/Plants/Threepeater/Threepeater.gif',
			'images/Plants/PB00.gif',
			'images/Plants/PeaBulletHit.gif'],
	AudioArr:['splat1','splat2','splat3','plastichit','shieldhit','shieldhit2'],
	Tooltip:'一次射出三行的豌豆',Produce:'三线射手可以在三条线上同时射出豌豆。<p>伤害：<font color="#FF0000">普通(每颗)</font><br>范围：<font color="#FF0000">三线</font></p>三线射手喜欢读书，下棋和在公园里呆坐。他也喜欢演出，特别是现代爵士乐。“我正在寻找我生命中的另一半，”他说。三线射手最爱的数字是5。',
	getTriggerR:function(R){return [R>2?R-1:1,R<oS.R?Number(R)+1:R];}, //传递行返回触发器行上下限,返回格式是[下限，上限]
	PrivateBirth:function(o){ //出生时建立一个子弹图片，射击直接使用cloneNode//创建一个子弹对象，射击直接继承该对象
		var LX=o.AttackedLX,pixelLeft=LX-40,pixelTop,oT=o.oTrigger,R;
		o.BulletClass=[];o.BulletEle=[];
		for(R in oT){
			o.BulletClass.push(NewO({X:LX,R:R,D:0,Attack:20,Kind:0,ChangeC:0,pixelLeft:pixelLeft,F:oGd.MB1}));
			o.BulletEle.push(NewImg(0,'images/Plants/PB00.gif','left:'+pixelLeft+'px;top:'+(GetY(R)-50)+'px;visibility:hidden;z-index:'+(3*R+2)));
		}
	},
	PrivateDie:function(o){o.BulletEle.length=0},
	NormalAttack:function(){
		var v,o=this,id,i=0;
		for(v in o.oTrigger){
			EditEle(o.BulletEle[i++].cloneNode(false),{id:id='PB'+Math.random()},0,EDPZ);
			oSym.addTask(15,function(id){var o=$(id);o&&SetVisible(o)},[id]);
			oSym.addTask(1,function(id,img,Attack,D,OX,R,Kind,ChangeC,pixelLeft,T){ //移动豌豆类子弹
				var side,C=GetC(OX),Z=oZ['getZ'+D](OX,R);
				Kind==0&&T[R+'_'+C]&&ChangeC!=C&&( //冰豌豆和普通豌豆飞过有火炬的格子，且在当前格子中是第一次变化（避免冰豌豆在一个格子就变成火豆）
					PlayAudio('firepea'),
					Kind=1,
					Attack=40,
					ChangeC=C,
					img.src='images/Plants/PB'+Kind+D+'.gif'
				);
				Z&&Z.Altitude==1?(
					Z[{'-1':'getSnowPea',0:'getPea',1:'getFirePea'}[Kind]](Z,Attack,D),
					(SetStyle(img,{left:pixelLeft+28+'px',width:'52px',height:'46px'})).src='images/Plants/PeaBulletHit.gif',
					oSym.addTask(10,ClearChild,[img])
				):(OX+=(side=!D?5:-5))<oS.W&&OX>100?(
					img.style.left=(pixelLeft+=side)+'px',
					oSym.addTask(1,arguments.callee,[id,img,Attack,D,OX,R,Kind,ChangeC,pixelLeft,T])
				):ClearChild(img);
			},[id,$(id),20,0,o.AttackedLX,v,0,0,o.AttackedLX-40,oGd.$Torch]);
		}
	}
}),

//加特林
oGatlingPea=InheritO(oPeashooter,{
	EName:'oGatlingPea',CName:'加特林',width:88,height:84,beAttackedPointR:68,SunNum:250,coolTime:50,
	PicArr:['images/Card/Plants/GatlingPea.png','images/Plants/GatlingPea/0.gif',
			'images/Plants/GatlingPea/GatlingPea.gif',
			'images/Plants/PB00.gif',
			'images/Plants/PeaBulletHit.gif'],
	AudioArr:['splat1','splat2','splat3','plastichit','shieldhit','shieldhit2'],
	Tooltip:'一次发射四颗豌豆<br>(需要双发射手)',Produce:'加特林可以一次发射四颗豌豆<p>伤害：<font color="#FF0000">中等(每颗)</font><br>发射速度：<font color="#FF0000">四倍<br>只能种在双发射手上</font></p>当加特林宣布他要参军的时候，他的父母很为他担心，他们异口同声地对他说：“亲爱的，但这太危险了。”加特林拒绝让步，“生活本就危险，”他这样回答着，此时他的眼睛里，正闪烁着钢铁般的信念。',
	PrivateBirth:function(o){
		var LX=o.AttackedLX,pixelLeft=LX-40;
		o.BulletClass=NewO({X:LX,R:o.R,D:0,Attack:20,Kind:o.BKind,ChangeC:0,pixelLeft:pixelLeft,F:oGd.MB1});
		o.BulletEle=NewImg(0,o.PicArr[3],'left:'+pixelLeft+'px;top:'+(o.pixelTop+8)+'px;visibility:hidden;z-index:'+(o.zIndex+2));
	},
	CanGrow:function(AP,R,C){var P=AP[1];return P&&P.EName=='oRepeater';},	//普通植物是双发
	NormalAttack1:oPeashooter.prototype.NormalAttack,
	NormalAttack:function(zid){
		this.NormalAttack1();
		oSym.addTask(15,function(id,t){
			var p=$P[id];
			p&&p.NormalAttack1();
			--t&&oSym.addTask(15,arguments.callee,[id,t]);
		},[this.id,3]);
	}
}),


//分裂射手
oSplitPea=InheritO(oPeashooter,{
	EName:'oSplitPea',CName:'分裂射手',width:92,height:72,beAttackedPointR:72,SunNum:125,
	PicArr:['images/Card/Plants/SplitPea.png','images/Plants/SplitPea/0.gif',
			'images/Plants/SplitPea/SplitPea.gif',
			'images/Plants/PB00.gif',
			'images/Plants/PB01.gif',
			'images/Plants/PeaBulletHit.gif'],
	AudioArr:['splat1','splat2','splat3','plastichit','shieldhit','shieldhit2'],
	Tooltip:'前后双向发射豌豆',Produce:'分裂射手，可以向前后两个方向发射豌豆。<p>伤害：<font color="#FF0000">中等</font><br>范围：<font color="#FF0000">前面和后面</font><br>发射速度：<font color="#FF0000">前面为正常速度，后面为两倍速度</font></p>分裂射手：“没错，我就是双子座。我知道，这的确很令人惊奇。不过，有两个头，或者实际上，长着一个头和一个类似头的东西，在背上，对我这条线上的防守帮助很大。',
	GetDX:function(){return -55},
	getShadow:function(o){return 'left:5px;top:'+(o.height-22)+'px'}, //用于初始化模板时返回影子样式
	getTriggerRange:function(R,LX,RX){return [[100,LX+25,1],[LX+26,oS.W,0]];},
	PrivateBirth:function(o){
		var PicArr=o.PicArr,cssText='px;top:'+(o.pixelTop+3)+'px;visibility:hidden;z-index:'+(o.zIndex+2);
		o.BulletEle=[NewImg(0,PicArr[3],'left:'+(o.AttackedLX-40)+cssText),NewImg(0,PicArr[4],'left:'+(o.AttackedRX-16)+cssText)],
		o.aTri=[0,0];
	},
	PrivateDie:function(o){o.BulletEle.length=0},
	TriggerCheck:function(o,d){
		if(this.aTri[d])return; //该方向已经被触发
		if(this.AttackCheck2(o)){
			++this.aTri[d];
			this.aTri[0]&&this.aTri[1]&&(this.canTrigger=0); //两个方向都>0，不能再次触发
			this.CheckLoop(o.id,d);
		}
	},
	AttackCheck1:function(zid,d){ //传递僵尸id和触发器方向再次检测是否符合攻击条件
		var o=this,Z=$Z[zid],d2;
		if(Z&&Z.PZ&&(Z.R==o.R)){ //僵尸还在本行存活
			d2=Z.ZX>o.AttackedLX+25?0:1; //获取僵尸实时所在方向0表示在右边1表示在左边
			//实时方向跟原方向一致，继续判断
			d==d2?(o.AttackCheck2(Z)?o.CheckLoop(zid,d):--o.aTri[d]):(++o.aTri[d2],--o.aTri[d]);
		}else{
			--o.aTri[d]; //僵尸已经不存在或者不在本行
		}
		o.canTrigger=o.aTri[0]&&o.aTri[1]?0:1;
	},
	CheckLoop:function(zid,d){ //开始攻击，并且循环检查攻击条件1,2
		this.NormalAttack(d);
		oSym.addTask(140,function(pid,zid,d){var p;(p=$P[pid])&&p.AttackCheck1(zid,d)},[this.id,zid,d]);
	},
	NormalAttack:function(D){
		var o=this,id,
		px=D?(
			oSym.addTask(15,function(id){$P[id]&&func(1)},[o.id]),
			o.AttackedRX-16
		):o.AttackedLX-40,
		func=function(){
			EditEle(o.BulletEle[D].cloneNode(false),{id:id='PB'+Math.random()},0,EDPZ);
			oSym.addTask(15,function(id){var o=$(id);o&&SetVisible(o)},[id]);
			oSym.addTask(1,function(id,img,Attack,D,OX,R,Kind,ChangeC,pixelLeft,T){ //移动豌豆类子弹
				var side,C=GetC(OX),Z=oZ['getZ'+D](OX,R);
				Kind==0&&T[R+'_'+C]&&ChangeC!=C&&( //冰豌豆和普通豌豆飞过有火炬的格子，且在当前格子中是第一次变化（避免冰豌豆在一个格子就变成火豆）
					PlayAudio('firepea'),
					Kind=1,
					Attack=40,
					ChangeC=C,
					img.src='images/Plants/PB'+Kind+D+'.gif'
				);
				Z&&Z.Altitude==1?(
					Z[{'-1':'getSnowPea',0:'getPea',1:'getFirePea'}[Kind]](Z,Attack,D),
					(SetStyle(img,{left:pixelLeft+28+'px',width:'52px',height:'46px'})).src='images/Plants/PeaBulletHit.gif',
					oSym.addTask(10,ClearChild,[img])
				):(OX+=(side=!D?5:-5))<oS.W&&OX>100?(
					img.style.left=(pixelLeft+=side)+'px',
					oSym.addTask(1,arguments.callee,[id,img,Attack,D,OX,R,Kind,ChangeC,pixelLeft,T])
				):ClearChild(img);
			},[id,$(id),20,D,o.AttackedLX,o.R,0,0,px,oGd.$Torch]);
		};
		func();
	}
}),

//向日葵
oSunFlower=InheritO(CPlants,{
	EName:'oSunFlower',CName:'向日葵',width:73,height:74,beAttackedPointR:53,SunNum:50,
	PicArr:['images/Card/Plants/SunFlower.png','images/Plants/SunFlower/0.gif','images/Plants/SunFlower/SunFlower1.gif','images/Plants/SunFlower/SunFlower.gif'],
	Tooltip:'提供你额外的阳光',Produce:'向日葵，为你生产额外阳光的经济作物。尝试尽可能多种植吧！<p>阳光产量：<font color="#FF0000">中等</font></p>向日葵情不自禁地和着节拍起舞。是什么节拍呢？嗨，是大地自己用来提神的爵士节拍，这种频率的节拍，只有向日葵才能听到。',
	BirthStyle:function(P,id,Pn,json){
		var o=Pn.childNodes[1];
		o.src='images/Plants/SunFlower/SunFlower.gif';
		o.style.clip='rect(0,auto,74px,0)';
		o.style.height='148px';
		EditEle(Pn,{id:id},json,EDPZ);
	},
	ChangePosition:function(o,i){
		//i为0表示往上，1表示往下
		var e=o.childNodes[1];
		i?
			SetStyle(e,{clip:'rect(74px,auto,auto,auto)',top:'-74px'})
			:SetStyle(e,{clip:'rect(auto,auto,74px,auto)',top:0});
	},
	PrivateBirth:function(o){ //出生后6秒产阳光，之后是24秒
		oS.ProduceSun? //关卡是否允许生产阳光
			oSym.addTask(500,function(id,X,Y){
				$P[id]&&(
					o.ChangePosition($(id),1),
					oSym.addTask(100,function(id,X,Y,func){
						$P[id]&&( //植物还存在
							AppearSun(Math.floor(X+Math.random()*41),Y,25,0), //产生阳光
							oSym.addTask(100,function(id){
								$P[id]&&o.ChangePosition($(id),0)
							},[id]),
							oSym.addTask(2400,func,[id,X,Y]) //增加新任务24秒后执行自身
						)					
					},[id,X,Y,arguments.callee])
				)
			},[o.id,GetX(o.C)-40,GetY(o.R)])
			: //不允许生产阳光，则每受到一次啃食产生阳光
			o.getHurt=function(o,AKind,Attack){ //植物受攻击函数，传递僵尸对象，攻击类型，攻击力作为参数
				//Akind:0直接啃食，1巨人是秒杀，2篮球车冰车碾压，3篮球车丢篮球,以及其他远程
				var p=this;
				switch(AKind){
					case 0: //啃食，产生阳光，受到伤害，只有当血量是100的倍数时才产生阳光
						var HP=(p.HP-=Attack);
						!(HP%100)&&(
							AppearSun(Math.floor(GetX(p.C)-40+Math.random()*41),GetY(p.R),25,0), //产生阳光
							oSym.addTask(50,function(C,R){AppearSun(Math.floor(GetX(C)-40+Math.random()*41),GetY(R),25,0);},[p.C,p.R]),
							HP<1?
								p.Die()
								:oSym.addTask(50,function(C,R){AppearSun(Math.floor(GetX(C)-40+Math.random()*41),GetY(R),25,0);},[p.C,p.R])
						)
						break;
					case 3: //篮球车或者远程，受到伤害
						(p.HP-=Attack)<1&&p.Die();
						break;
					default: //1巨人秒杀2篮球车冰车碾压
						p.Die(1);
				}
			};
	},
	InitTrigger:function(){}
}),

//双子向日葵
oTwinSunflower=InheritO(oSunFlower,{
	EName:'oTwinSunflower',CName:'双子向日葵',width:83,height:84,beAttackedPointR:63,SunNum:150,coolTime:50,
	PicArr:['images/Card/Plants/TwinSunflower.png','images/Plants/TwinSunflower/0.gif','images/Plants/TwinSunflower/TwinSunflower1.gif','images/Plants/TwinSunflower/TwinSunflower.gif'],
	Tooltip:'一次提供两倍于向日葵的阳光量<br>(需要向日葵)',Produce:'双子向日葵的阳光产量是普通向日葵的两倍。<p>阳光产量：<font color="#FF0000">双倍<br>只能种在普通向日葵上</font></p>这是一个疯狂的夜晚，禁忌的科学技术，让双子向日葵来到了这个世界。电闪雷鸣，狂风怒吼，都在表示着这个世界对他的拒绝。但是一切都无济于事，双子向日葵他却仍然活着！',
	CanGrow:function(AP,R,C){ //判断能否种植
		var P=AP[1];return P&&P.EName=='oSunFlower';
	},	//普通植物是小向
	BirthStyle:function(P,id,Pn,json){
		var o=Pn.childNodes[1];
		o.src='images/Plants/TwinSunflower/TwinSunflower.gif';
		o.style.clip='rect(0,auto,84px,0)';
		o.style.height='168px';
		EditEle(Pn,{id:id},json,EDPZ);
	},
	ChangePosition:function(o,i){
		//i为0表示往上，1表示往下
		var e=o.childNodes[1];
		i?
			SetStyle(e,{clip:'rect(84px,auto,auto,auto)',top:'-84px'})
			:SetStyle(e,{clip:'rect(auto,auto,84px,auto)',top:0});
	},
	PrivateBirth:function(o){ //出生后6秒产阳光，之后是24秒
		var X=GetX(o.C);
		oSym.addTask(500,function(id,X1,X2,Y){
			$P[id]&&( //植物还存在
				o.ChangePosition($(id),1),
				oSym.addTask(100,function(id,X1,X2,Y,func){
					AppearSun(Math.floor(X1+Math.random()*21),Y,25,0),
					AppearSun(Math.floor(X2+Math.random()*21),Y,25,0),
					oSym.addTask(100,function(id){
						$P[id]&&o.ChangePosition($(id),0)
					},[id]),
					oSym.addTask(2400,func,[id,X1,X2,Y]) //增加新任务24秒后执行自身
				},[id,X1,X2,Y,arguments.callee])
			)
		},[o.id,X-40,X-20,GetY(o.R)])
	}
}),

//南瓜头
oPumpkinHead=InheritO(CPlants,{
	EName:'oPumpkinHead',CName:'南瓜头',width:97,height:67,beAttackedPointL:15,beAttackedPointR:82,SunNum:125,
	PKind:2,HP:4000,coolTime:30,zIndex:1,
	PicArr:['images/Card/Plants/PumpkinHead.png','images/Plants/PumpkinHead/0.gif',
			'images/Plants/PumpkinHead/PumpkinHead.gif',
			'images/Plants/PumpkinHead/PumpkinHead1.gif',
			'images/Plants/PumpkinHead/PumpkinHead2.gif',
			'images/Plants/PumpkinHead/pumpkin_damage1.gif',
			'images/Plants/PumpkinHead/pumpkin_damage2.gif',
			'images/Plants/PumpkinHead/Pumpkin_back.gif'],
	Tooltip:'能保护种在里面的植物',Produce:'南瓜头，可以用他的外壳保护其他植物。<p>韧性：<font color="#FF0000">高</font><br>特点：<font color="#FF0000">可以种在其他植物上</font></p>南瓜头最近都没收到，关于他表哥刃菲尔德的消息。很明显，刃菲尔德是个大明星，是一种……叫什么运动来着……的体育明星？佩格跳跳球大师？南瓜头反正搞不懂是什么运动，他只想做好他自己的工作。',
	CanGrow:function(AP,R,C){ //判断能否种植
		var S=R+'_'+C;
		return AP[2]?1:oGd.$LF[R]==1?!(C<1||C>9||oGd.$Crater[S]||oGd.$Tombstones[S]):AP[0];
	},	//有南瓜，直接覆盖南瓜；草地，若范围超出或有弹坑，false；其他类型，必须有容器
	GetDY:function(R,C,AP){return AP[0]?-12:-5}, //GetDeviationY，返回纵坐标偏移
	HurtStatus:0, //0表示未损 1 2分别表示两种受损程度
	getHurt:function(o,AKind,Attack){ //植物受攻击函数，传递僵尸对象，攻击类型，攻击力作为参数
		//返回值1表示植物还存活0表示植物死亡
		//Akind:0直接啃食，1巨人是秒杀，2篮球车冰车碾压，3篮球车丢篮球,以及其他远程
		var p=this,id=p.id,dC=$(id);
		switch(true){
			case AKind&&AKind<3:p.Die(1);break;
			case (p.HP-=Attack)<1:p.Die();break;
			case p.HP<1334:
				p.HurtStatus<2&&(p.HurtStatus=2,dC.childNodes[1].src='images/Plants/PumpkinHead/pumpkin_damage2.gif');
				break;
			case p.HP<2667:
				p.HurtStatus<1&&(p.HurtStatus=1,dC.childNodes[1].src='images/Plants/PumpkinHead/pumpkin_damage1.gif',$(id+'_2').src='images/Plants/PumpkinHead/Pumpkin_back.gif');
		}
	},
	InitTrigger:function(){}, //初始化触发器事件置空
	BirthStyle:function(P,id,Pn,json){
		Pn.childNodes[1].src='images/Plants/PumpkinHead/PumpkinHead1.gif';
		EditEle(Pn,{id:id},json,EDPZ);
		NewImg(id+'_2','images/Plants/PumpkinHead/PumpkinHead2.gif','left:'+P.pixelLeft+'px;top:'+P.pixelTop+'px;z-index:'+(P.zIndex-2),EDPZ);
	}, //添加南瓜的背面
	PrivateDie:function(o){ClearChild($(o.id+'_2'))}
}),

//花盆
oFlowerPot=InheritO(CPlants,{
	EName:'oFlowerPot',CName:'花盆',width:72,height:68,beAttackedPointR:52,SunNum:25,
	BookHandBack:5,
	PicArr:['images/Card/Plants/FlowerPot.png','images/Plants/FlowerPot/0.gif','images/Plants/FlowerPot/FlowerPot.gif'],
	PKind:0,Stature:-1,
	GetDY:function(R,C,AP){return 6;}, //草地屋顶都是6
	CanGrow:function(AP,R,C){ //判断能否种植 只能种植在草地和屋顶 屋顶只需判断无花盆无弹坑 草地需判断无弹坑无普通植物无南瓜无容器
		var S=R+'_'+C,LF=oGd.$LF[R],PC=C<1||C>9;
		return LF%2?LF<3?!(PC||AP[1]||AP[2]||AP[0]||oGd.$Crater[S]||oGd.$Tombstones[S]):!(PC||AP[0]||oGd.$Crater[S]):0;
	},
	Tooltip:'可以让植物栽种在屋顶上',Produce:'花盆可以让你在屋顶上种植植物。<p>特点：<font color="#FF0000">允许你在屋顶上种植</font></p>“我是一个让植物栽种的花盆，但我也是一棵植物。是不是很意外？',
	InitTrigger:function(){}
}),

//睡莲
oLilyPad=InheritO(oFlowerPot,{
	BookHandBack:4,Stature:-1,
	EName:'oLilyPad',CName:'睡莲',width:79,height:58,beAttackedPointR:59,
	PicArr:['images/Card/Plants/LilyPad.png','images/Plants/LilyPad/0.gif','images/Plants/LilyPad/LilyPad.gif'],
	getShadow:function(o){return 'left:-8px;top:25px'}, //用于初始化模板时返回影子样式
	CanGrow:function(AP,R,C){ //判断能否种植
		var S=R+'_'+C;
		return !(C<1||C>9||oGd.$LF[R]-2||AP[0]||AP[1]||oGd.$Crater[S]);
		//C在范围内，是水池，没容器，没普通植物，没弹坑
	},
	Tooltip:'使你能够将非水生植物种在上面',Produce:'睡莲可以让你种植非水生植物在它上面。<p>特点：<font color="#FF0000">非水生植物可以种植在它上面<br>必须种植在水面</font></p>睡莲从不抱怨，它也从来不想知道发生了什么事。在它身上种植物，它也不会说什么。难道，它有什么惊奇想法或者可怕的秘密？没人知道。睡莲把这些都埋藏在心底。'
}),

//土豆雷
oPotatoMine=InheritO(CPlants,{
	EName:'oPotatoMine',CName:'土豆雷',width:75,height:55,beAttackedPointR:55,SunNum:25,coolTime:30,
	Stature:-1,
	CanGrow:function(AP,R,C){ //判断能否种植 草地 没普通植物没弹坑 屋顶 有容器没普通植物
		var S=R+'_'+C,LF=oGd.$LF[R],ArP=oS.ArP;
		if(ArP){
			switch(LF){
				case 0,3: //荒地，屋顶无法种植
					return(false);
				case 1: //草地
					return(C>0&&C<ArP.ArC[1]&&!(AP[1]||oGd.$Crater[S]||oGd.$Tombstones[S]));
				case 2: //水池
					return(C>0&&C<ArP.ArC[1]&&AP[0]&&!AP[1]);
			}
		}else{
			switch(LF){
				case 0,2,3: //荒地，水池，屋顶无法种植
					return(false);
				case 1: //草地
					return(!(C<1||C>9||AP[1]||oGd.$Crater[S]||oGd.$Tombstones[S]));
			}
		}
	},
	PicArr:['images/Card/Plants/PotatoMine.png','images/Plants/PotatoMine/0.gif',
			'images/Plants/PotatoMine/PotatoMine.gif',
			'images/Plants/PotatoMine/PotatoMineNotReady.gif',
			'images/Plants/PotatoMine/PotatoMine_mashed.gif',
			'images/Plants/PotatoMine/ExplosionSpudow.gif'],
	Tooltip:'敌人接触后爆炸<br>需要时间安放',Produce:'土豆雷具有强大的威力，但是他们需要点时间来武装自己。你应把他们种在僵尸前进的路上，当他们一被接触就会发生爆炸。<p>伤害：<font color="FF0000">巨大</font><br>范围：<font color="#FF0000">一个小区域内的所有僵尸</font><br>使用方法：<font color="#FF0000">单独使用，需要一定准备时间才能起作用。</font></p>一些人说土豆雷很懒，因为他总是把所有事情留到最后。土豆雷才没空理他们，他正忙着考虑他的投资战略呢。',
	Status:0, //未破土 1已经破土
	AudioArr:['potato_mine'],
	canTrigger:0, //未破土时不可触发
	BirthStyle:function(P,id,Pn,json,arg){
		Pn.childNodes[1].src=!arg? //未传递arg表示种植未出土的土豆雷，否则种植已经出土的
			'images/Plants/PotatoMine/PotatoMineNotReady.gif'
			:(~function(){
				P.Status=1;
				P.canTrigger=1;
				P.getHurt=P.getHurt2;
			}(),
			'images/Plants/PotatoMine/PotatoMine.gif');
		EditEle(Pn,{id:id},json,EDPZ);
	},
	getHurt2:function(o,AKind,Attack){ //受伤害函数替换
		var p=this;
		AKind>2?(p.HP-=Attack)<1&&p.Die():p.NormalAttack(p.pixelLeft,p.pixelRight,p.R);
	},
	PrivateBirth:function(o,arg){
		!arg&&oSym.addTask(1500,function(id){
			var o=$P[id];
			o&&(
				$(id).childNodes[1].src='images/Plants/PotatoMine/PotatoMine.gif',
				o.Status=1, //已出土
				o.canTrigger=1, //可触发
				o.getHurt=o.getHurt2,
				o.getCrushed=function(z){ //出土后被碾压爆炸
					this.NormalAttack(this.pixelLeft,this.pixelRight,this.R);
				}
			)
		},[o.id])
	},
	getTriggerRange:function(R,LX,RX){return [[LX,RX,0]]},
	TriggerCheck:function(o,d){
		var R=this.R,C=this.C;
		o.beAttacked&&o.Altitude<2&&!oGd.$[R+'_'+C+'_2']&&this.NormalAttack(this.pixelLeft,this.pixelRight,this.R) //植物非临死，没南瓜
	},
	NormalAttack:function(LX,RX,R){ //传递爆炸范围和行
		var P=this,id=P.id,dC=$(id),ar=oZ.getArZ(LX,RX,R),i=ar.length,Z;
		//while(i--)(Z=ar[i]).Altitude<2&&Z.getHurt(0,0,1800,0,0,0,2);
		while(i--)(Z=ar[i]).Altitude<2&&Z.getThump();
		P.Die(1); //传递1给死亡函数，表示不移除图片，由爆炸函数延时移除
		PlayAudio('potato_mine');
		EditEle(dC.childNodes[1],{src:'images/Plants/PotatoMine/PotatoMine_mashed.gif'},{width:'132px',height:'93px',left:'-40px',top:'-20px'});
		NewImg(0,'images/Plants/PotatoMine/ExplosionSpudow.gif','left:-90px;top:-40px',dC);
		oSym.addTask(200,function(dC){
			ClearChild(dC.lastChild); //爆炸字样移除
			oSym.addTask(100,ClearChild,[dC]); //植物本身的爆炸堆移除
		},[dC]);
	}
}),

//火炬树桩
oTorchwood=InheritO(CPlants,{
	EName:'oTorchwood',CName:'火炬树桩',width:73,height:83,beAttackedPointR:53,SunNum:175,
	PicArr:['images/Card/Plants/Torchwood.png','images/Plants/Torchwood/0.gif',
			'images/Plants/Torchwood/Torchwood.gif',
			'images/Plants/PB00.gif',
			'images/Plants/PB01.gif',
			'images/Plants/PB10.gif',
			'images/Plants/PB11.gif',
			'images/Plants/Torchwood/SputteringFire.gif'],
	AudioArr:['firepea','ignite','ignite2'],
	Tooltip:'通过火炬树桩的豌豆将变为火球',Produce:'火炬树桩可以把穿过他的豌豆变成火球，可以造成两倍伤害。<p>特点：<font color="#FF0000">让穿过他的火球造成两倍伤害。火球也会对附近僵尸造成溅射伤害</font></p>每个人都喜欢并敬重火炬树桩。他们喜欢他的诚实和坚贞的友谊，以及增强豌豆伤害的能力。但他也有自己的秘密：他不识字！',
	PrivateBirth:function(o){
		var R=o.R,C=o.C;
		oGd.$Torch[R+'_'+C]=o.id;
		oS.HaveFog&&oGd.GatherFog(R,C,1,1,0); //在有雾的关卡驱散雾
	}, //设置火炬标记
	InitTrigger:function(){},
	PrivateDie:function(o){
		var R=o.R,C=o.C;
		delete oGd.$Torch[R+'_'+C];
		oS.HaveFog&&oGd.GatherFog(R,C,1,1,1); //在有雾的关卡聚拢雾
	}
}),

//小坚果
oWallNut=InheritO(CPlants,{
	EName:'oWallNut',CName:'坚果墙',width:65,height:73,beAttackedPointR:45,SunNum:50,HP:4000,coolTime:30,
	PicArr:['images/Card/Plants/WallNut.png','images/Plants/WallNut/0.gif',
			'images/Plants/WallNut/WallNut.gif',
			'images/Plants/WallNut/Wallnut_cracked1.gif',
			'images/Plants/WallNut/Wallnut_cracked2.gif'],
	Tooltip:'阻碍僵尸前进, 并保护你其他的植物',Produce:'坚果墙拥有足以让你用来保护其它植物的坚硬外壳。<p>韧性：<font color="FF0000">高</font></p>坚果墙：“人们想知道，经常被僵尸啃的感觉怎样？他们不知道，我有限的感官，只能让我感到一种麻麻的感觉，像是，令人放松的背部按摩。”',
	CanGrow:function(AP,R,C){ //判断能否种植
		var S=R+'_'+C,P=AP[1],ArP=oS.ArP;
		return ArP?
			oGd.$LF[R]==1?C>0&&C<ArP.ArC[1]&&!(oGd.$Crater[S]||oGd.$Tombstones[S]||P):AP[0]&&!P
			:P&&P.EName=='oWallNut'?1:oGd.$LF[R]==1?!(C<1||C>9||oGd.$Crater[S]||oGd.$Tombstones[S]||P):AP[0]&&!P;
	},
	InitTrigger:function(){},HurtStatus:0,
	getHurt:function(o,AKind,Attack){
		var p=this,dP=$(p.id).childNodes[1];
		!(AKind%3)?(p.HP-=Attack)<1?p.Die():p.HP<1334?p.HurtStatus<2&&(p.HurtStatus=2,dP.src='images/Plants/WallNut/Wallnut_cracked2.gif'):p.HP<2667&&p.HurtStatus<1&&(p.HurtStatus=1,dP.src='images/Plants/WallNut/Wallnut_cracked1.gif'):p.Die(1);
	}
}),

//坚果保龄球
oNutBowling=InheritO(CPlants, {
	EName: "oNutBowling",CName: "坚果保龄球",width: 71,height: 71,beAttackedPointL: 10,beAttackedPointR: 61,
	SunNum: 0,HP: 4000,coolTime: 0,canEat: 0,Tooltip: "",
	PicArr: ["images/Card/Plants/WallNut.png", "images/Plants/WallNut/0.gif", "images/Plants/WallNut/WallNutRoll.gif"],
	AudioArr:['bowling','bowlingimpact','bowlingimpact2'],
	Produce: "",CanAttack:1,
	InitTrigger: function() {},
	getHurt: function() {},
	CanGrow: function(b, a, c) {return true},
	NormalAttack:null,
	PrivateBirth: function(b) {
		var a=$(b.id);
		PlayAudio('bowling');
		(function(d, f, o, n, pixelLeft,h,side,MinY,MaxY) { //side：滚动方向0表示平行1表示下-1表示上
		//MinY,MaxY:保龄球上下滚动的范围，1-R行的纵坐标
			var oR = d.R,oC=d.C,c, k, m, j = 0,NowR,NowC,ResetRC=false;
			if(d.CanAttack&&(c = oZ.getZ0(n, oR))&&c.getCrushed(d)){ //可以攻击，就找僵尸，找到僵尸则攻击，不行进
				k = c.id;
				PlayAudio(['bowlingimpact','bowlingimpact2'][Math.floor(Math.random()*2)]);
				switch (c.Ornaments) {
					case 0: //无饰品，伤害1800
						c.NormalDie();break;
					case 1: //1类型的饰品伤害900
						c.getHit0(c,Math.min(c.OrnHP,900),0);break; //饰品伤害900，最小值为0
					default: //二类饰品直线攻击时伤害450，否则直接攻击本体
						d.side?c.Normaldie():c.CheckOrnHP(c,k,c.OrnHP,400,c.PicArr,0,0,0);
				}
				d.CanAttack = 0;
				//side=-1表示往上，1表示往下
				//初次撞僵尸在中间则随机选择方向，之后再撞僵尸必须反向行进
				switch(oR){
					case oS.R:side=-1;break; //最后一行，往上走
					case 1:side=1;break; //第一行，往下走
					default:
						switch(side){
							case 1:side=-1;break;
							case -1:side=1;break;
							default:side=Math.random()>.5?1:-1; //中间随机上下
						}
				}
				oSym.addTask(1, arguments.callee, [d, f, d.AttackedLX+20, d.AttackedRX+20,d.pixelLeft+20, h,side,MinY,MaxY]);
			}else{ //直线或者斜线行进，到1行的MinY或者到最大行的MaxY则反弹
				//直线行进的不改变，斜线行进的判断上下限					
				switch(side){
					case 1: //往下的
						d.pixelBottom+2>MaxY&&(side=-1);break;
					case -1:
						d.pixelBottom-2<MinY&&(side=1);break;
				}
				o > f ?
					d.Die():(
						NowC=GetC(d.pixelRight+=2),
						d.AttackedLX=o+=2,
						d.AttackedRX=n+=2,
						NowR=GetR(d.pixelBottom+=side*2), //获取移动后的行
						SetStyle(h,{left:(d.pixelLeft=pixelLeft+=2)+"px",top:(d.pixelTop+=side*2)+"px"}), //移动图片
						NowR!=oR&&( //移动后行改变了
							d.R=NowR, //新的行
							ResetRC=true, //行改变，重新在oGd的植物对象索引中更新
							!d.CanAttack&&(d.CanAttack=1) //如果不能攻击，换行后可以攻击
						),
						NowC!=oC&&(d.C=NowC,ResetRC=true),
						ResetRC&&(
							oGd.del({
								R:oR,
								C:oC,
								PKind:1
							}),
							oGd.add(d,NowR+'_'+NowC+'_1')
						),
						oSym.addTask(1, arguments.callee, [d, f, d.AttackedLX, d.AttackedRX,d.pixelLeft, h,side,MinY,MaxY])
					);
			}
		})(b, oS.W, b.AttackedLX, b.AttackedRX,b.pixelLeft,a, 0,GetY1Y2(1)[0],600)
	}
}),

//巨型坚果保龄球
oHugeNutBowling=InheritO(oNutBowling, {
	EName: "oHugeNutBowling",CName: "巨型坚果保龄球",width: 142,height: 142,beAttackedPointL: 5,beAttackedPointR: 137,
	HP: 8000,Stature:1,
	PicArr: ["images/Card/Plants/HugeWallNut.png", "images/Plants/WallNut/2.gif", "images/Plants/WallNut/HugeWallNutRoll.gif"],
	PrivateBirth:function(p) {
		PlayAudio('bowling');
		(function(p,W,AttackedLX,AttackedRX,R,img){
			var aZ=oZ.getArZ(AttackedLX,AttackedRX,R),i=aZ.length,tmpZ,NowC,oR=p.R,oC=p.C;
			while(i--)(tmpZ=aZ[i]).getCrushed(p)&&tmpZ.CrushDie();
			AttackedLX>W?
				p.Die()
				:(
					NowC=GetC(p.pixelRight+=2),
					p.AttackedLX=AttackedLX+=2,
					p.AttackedRX=AttackedRX+=2,
					img.style.left=(p.pixelLeft+=2)+'px',
					NowC!=oC&&(
						p.C=NowC,
						oGd.del({
							R:oR,
							C:oC,
							PKind:1
						}),
						oGd.add(p,oR+'_'+NowC+'_1')
					),
					oSym.addTask(1,arguments.callee,[p,W,AttackedLX,AttackedRX,R,img])
				);
		})(p,oS.W,p.AttackedLX,p.AttackedRX,p.R,$(p.id));
	}
}),

//爆炸坚果
oBoomNutBowling=InheritO(oNutBowling, {
	EName: "oBoomNutBowling",CName: "爆炸坚果",
	PicArr: ["images/Card/Plants/BoomWallNut.png", "images/Plants/WallNut/1.gif", "images/Plants/WallNut/BoomWallNutRoll.gif","images/Plants/CherryBomb/Boom.gif"],
	AudioArr:['cherrybomb','bowling'],
	PrivateBirth: function(b) {
		PlayAudio('bowling');
		(function(d, f, o, n, h) {
		//MinY,MaxY:保龄球上下滚动的范围，1-R行的纵坐标
			var oR = d.R,oC=d.C,z,NowC;
			if((z = oZ.getZ0(n, oR))&&z.getCrushed(d)){ //可以攻击，就找僵尸，找到僵尸则攻击，不行进
				var R1=oR>2?oR-1:1,R2=oR<oS.R?oR+1:oS.R,LX=d.pixelLeft-80,RX=d.pixelLeft+160,ar,i;
				PlayAudio('cherrybomb');
				do{i=(ar=oZ.getArZ(LX,RX,R1)).length;
					while(i--)ar[i].ExplosionDie();
				}while(R1++<R2);
				d.Die(1);
				EditEle(h.childNodes[1],{src:'images/Plants/CherryBomb/Boom.gif'},{width:'213px',height:'160px',left:'-50px',top:'-30px'});
				oSym.addTask(65,ClearChild,[h]);
			}else{ //直线行进
				o > f ?
					d.Die():(
						NowC=GetC(d.pixelRight+=2),
						d.AttackedLX=o+=2, 
						d.AttackedRX=n+=2,
						SetStyle(h,{left:(d.pixelLeft+=2)+"px"}), //移动图片
						NowC!=oC&&(
							d.C=NowC,
							oGd.del({
								R:oR,
								C:oC,
								PKind:1
							}),
							oGd.add(d,oR+'_'+NowC+'_1')
						),
						oSym.addTask(1, arguments.callee, [d, f, d.AttackedLX, d.AttackedRX, h])
					);
			}
		})(b, oS.W, b.AttackedLX, b.AttackedRX,$(b.id))
	}
}),

//高坚果
oTallNut=InheritO(oWallNut,{
	EName:'oTallNut',CName:'高坚果',width:83,height:119,beAttackedPointR:63,SunNum:125,HP:8000,
	PicArr:['images/Card/Plants/TallNut.png','images/Plants/TallNut/0.gif',
			'images/Plants/TallNut/TallNut.gif',
			'images/Plants/TallNut/TallnutCracked1.gif',
			'images/Plants/TallNut/TallnutCracked2.gif'],
	Tooltip:'不会被跳过的坚实壁垒',Produce:'高坚果是重型壁垒植物，而且不会被跨过。<p>韧性：<font color="#FF0000">非常高</font><br>特殊：<font color="#FF0000">不会被跨过或越过</font></p>人们想知道，坚果墙和高坚果是否在竞争。高坚果以男中音的声调大声笑了。“我们之间怎么会存在竞争关系？我们是哥们儿。你知道坚果墙为我做了什么吗……”高坚果的声音越来越小，他狡黠地笑着。”',
	CanGrow:function(AP,R,C){ //判断能否种植
		var S=R+'_'+C,P=AP[1],ArP=oS.ArP;
		return ArP?
			oGd.$LF[R]==1?C>0&&C<ArP.ArC[1]&&!(oGd.$Crater[S]||oGd.$Tombstones[S]||P):AP[0]&&!P
			:P&&P.EName=='oTallNut'?1:oGd.$LF[R]==1?!(C<1||C>9||oGd.$Crater[S]||oGd.$Tombstones[S]||P):AP[0]&&!P;
	},
	Stature:1,
	getHurt:function(o,AKind,Attack){
		var p=this,dP=$(p.id).childNodes[1];
		!(AKind%3)?(p.HP-=Attack)<1?p.Die():p.HP<2667?p.HurtStatus<2&&(p.HurtStatus=2,dP.src='images/Plants/TallNut/TallnutCracked2.gif'):p.HP<5333&&p.HurtStatus<1&&(p.HurtStatus=1,dP.src='images/Plants/TallNut/TallnutCracked1.gif'):p.Die(1);
	}
}),

//樱桃炸弹
oCherryBomb=InheritO(CPlants,{
	EName:'oCherryBomb',CName:'樱桃炸弹',width:112,height:81,beAttackedPointR:92,SunNum:150,coolTime:50,
	PicArr:['images/Card/Plants/CherryBomb.png','images/Plants/CherryBomb/0.gif',
			'images/Plants/CherryBomb/CherryBomb.gif',
			'images/Plants/CherryBomb/Boom.gif'+$Random],
	AudioArr:['cherrybomb'],
	Tooltip:'炸掉一定区域内的所有僵尸',Produce:'樱桃炸弹，能炸掉一定区域内所有僵尸。他们一种下就会立刻引爆。所以请把他们种在僵尸们的身边。<p>伤害：<font color="#FF0000">巨大</font><br>范围：<font color="#FF0000">一个中等区域内的所有僵尸</font><br>使用方法：<font color="#FF0000">单独使用，立即爆炸</font></p>“我要‘爆’开了。”樱桃一号说。“不，我们是要‘炸’开了！”它哥哥樱桃二号说。经过激烈的商议之后，他们才统一“爆炸这个说法。”',
	InitTrigger:function(){},
	getHurt:function(){},
	getCrushed:function(z){},
	PrivateBirth:function(o){
		oSym.addTask(63,function(id){
			var p=$P[id];
			if(p){
				PlayAudio('cherrybomb');
				var dC=$(id),R=p.R,R1=R>2?R-1:1,R2=R<oS.R?R+1:oS.R,LX=p.pixelLeft-80,RX=p.pixelLeft+160,ar,i;
				do{	i=(ar=oZ.getArZ(LX,RX,R1)).length;
					//while(i--)ar[i].getHurt(0,0,1800,0,0,0,1);
					while(i--)ar[i].getExplosion();
				}while(R1++<R2);
				p.Die(1);
				EditEle(dC.childNodes[1],{src:p.PicArr[3]+Math.random()},{width:'213px',height:'196px',left:'-50px',top:'-37px'});
				//oSym.addTask(65,ClearChild,[dC]);
				oSym.addTask(120,ClearChild,[dC]);
			}
		},[o.id])
	}
}),

//火爆辣椒
oJalapeno=InheritO(oCherryBomb,{
	EName:'oJalapeno',CName:'火爆辣椒',width:68,height:89,beAttackedPointR:48,
	PicArr:['images/Card/Plants/Jalapeno.png','images/Plants/Jalapeno/0.gif',
			'images/Plants/Jalapeno/Jalapeno.gif',
			'images/Plants/Jalapeno/JalapenoAttack.gif'],
	AudioArr:['jalapeno'],
	Tooltip:'消灭整行的敌人',Produce:'火爆辣椒可以摧毁一整条线上的敌人。<p>伤害：<font color="#FF0000">极高</font><br>范围：<font color="#FF0000">整条线上的僵尸</font><br>用法：<font color="#FF0000">单独使用，立即生效</font></p>“嘎嘎嘎嘎嘎嘎嘎！！！”火爆辣椒说。他现在不会爆炸，还不到时候，不过快了，喔~，快了快了，快来了。他知道，他感受到了，他一生都是在等待这个时刻！',
	PrivateBirth:function(o){
		oSym.addTask(72,function(id){
			var p=$P[id];
			if(p){
				PlayAudio('jalapeno');
				var dC=$(id),R=p.R,ar=oZ.getArZ(100,oS.W,R),i=ar.length,ArIce=oGd.$Ice[R],Crater=oGd.$Crater;
				//while(i--)ar[i].getHurt(0,0,1800,0,0,0,1);
				while(i--)ar[i].getExplosion();
				p.Die(1);
				EditEle(dC.childNodes[1],{src:'images/Plants/Jalapeno/JalapenoAttack.gif'},{width:'755px',height:'131px',left:120-p.pixelLeft+'px',top:'-42px'});
				oSym.addTask(135,ClearChild,[dC]);
				ClearChild($('dIceCar'+R));
				if(ArIce)for(i=ArIce[1];i<11;i++)delete Crater[R+'_'+i]
			}
		},[o.id])
	}
}),

//地刺
oSpikeweed=InheritO(CPlants,{
	EName:'oSpikeweed',CName:'地刺',width:85,height:35,beAttackedPointL:10,beAttackedPointR:75,SunNum:100,Stature:-1,canEat:0,
	PicArr:['images/Card/Plants/Spikeweed.png','images/Plants/Spikeweed/0.gif','images/Plants/Spikeweed/Spikeweed.gif'],
	Attack:20,ArZ:{},
	Tooltip:'扎破轮胎, 也能伤害走在上面的僵尸',Produce:'地刺可以扎破轮胎，并对踩到他的僵尸造成伤害<p>伤害：<font color="#FF0000">普通</font><br>范围：<font color="#FF0000">所有踩到他的僵尸</font><br>特点：<font color="#FF0000">不会被僵尸吃掉</font></p>地刺痴迷冰球，他买了包厢的季票。他一直关注着他喜欢的球员，他也始终如一的在赛后清理冰球场。但只有一个问题：他害怕冰球。',
	CanGrow:function(AP,R,C){ //是草地 没普通植物 没容器 没弹坑
		var S=R+'_'+C,ArP=oS.ArP;
		return ArP?
			C>0&&C<ArP.ArC[1]&&oGd.$LF[R]==1&&!(AP[1]||AP[0])
			:!(C<1||C>9||oGd.$LF[R]-1||AP[1]||AP[0]||oGd.$Crater[S]||oGd.$Tombstones[S]);
	},
	getHurt:function(o,AKind,Attack){
		//Akind:0直接啃食，1巨人是秒杀，2篮球车冰车碾压，3篮球车丢篮球,以及其他远程
		var p=this;
		switch(AKind){
			case 2:
				o.flatTire();p.Die();break; //受到碾压，车爆胎，自身死亡
			case 1:
				o.getHit2(o,20,0);p.Die();break; //受到敲击，给巨人造成20伤害，自身死亡
			default:
				(p.HP-=Attack)<1&&p.Die();
		}
	},
	//受到碾压，车爆胎，自身死亡
	getCrushed:function(z){
		z.flatTire();
		this.Die();
	},
	NormalAttack:function(zid,s){var z=$Z[zid];z.getHit2(z,this.Attack,0)},
	GetDY:function(R,C,AP){return -2},
	getTriggerRange:function(R,LX,RX){return [[this.pixelLeft-80,this.pixelRight+80,0]];},
	TriggerCheck:function(o,d){
		var zid=o.id,ArZ=this.ArZ,ZLX,ZRX,PLX,PRX;
		o.PZ&&!ArZ[zid]&&(
			ZLX=o.AttackedLX,
			ZRX=o.AttackedRX,
			PLX=this.AttackedLX,
			PRX=this.AttackedRX,
			ZLX<=PRX&&ZLX>=PLX||ZRX<=PRX&&ZRX>=PLX||ZLX<=PLX&&ZRX>=PRX)
		&&this.AttackCheck2(o)
		&&(ArZ[zid]=1,
			this.NormalAttack(zid),
			oSym.addTask(100,function(pid,zid){var p=$P[pid];p&&delete p.ArZ[zid]},[this.id,zid])
		)
	}, //地刺的触发器总是可用的
	AttackCheck2:function(o){return o.Altitude==1&&o.beAttacked} //行走且非临死
}),

//地刺王
oSpikerock=InheritO(oSpikeweed,{
	EName:'oSpikerock',CName:'地刺王',width:84,height:43,beAttackedPointL:10,beAttackedPointR:74,SunNum:125,coolTime:50,HP:450,
	PicArr:['images/Card/Plants/Spikerock.png','images/Plants/Spikerock/0.gif','images/Plants/Spikerock/Spikerock.gif','images/Plants/Spikerock/2.gif','images/Plants/Spikerock/3.gif'],
	Attack:40,
	Tooltip:'能扎破多个轮胎, 并伤害经过上面的僵尸<br>(需要地刺)',Produce:'地刺王可以扎破多个轮胎，并对踩到他的僵尸造成伤害。<p><font color="#FF0000">必须种植在地刺上</font></p>地刺王刚刚从欧洲旅行回来。他玩的很高兴，也认识了很多有趣的人。这些都真的拓展了他的视野——他从来不知道，他们建造了这么大的博物馆，有这么多的画作。这对他来说太惊奇了。',
	CanGrow:function(AP,R,C){var p=AP[1];return p&&p.EName=='oSpikeweed';},
	GetDY:function(R,C,AP){return 0;},
	getHurt:function(o,AKind,Attack){
		var p=this,HP,img=$(p.id).childNodes[1];
		switch(AKind){
			case 2:
				o.flatTire();break; //受到碾压，车爆胎，自身受到碾压50点伤害
			case 1:
				o.getHit2(o,40,0); //受到敲击，给巨人造成40伤害，自身受到敲击50点伤害
		}
		switch(true){
			case ((HP=p.HP-=Attack)<1):p.Die();break;
			case HP<151:img.src='images/Plants/Spikerock/3.gif';break;
			case HP<301:img.src='images/Plants/Spikerock/2.gif';
		}
	},
	//受到碾压，车爆胎，自身死亡
	getCrushed:function(z){
		z.flatTire();
		var p=this,HP,img=$(p.id).childNodes[1];
		switch(true){
			case ((HP=p.HP-=Attack)<1):p.Die();break;
			case HP<151:img.src='images/Plants/Spikerock/3.gif';break;
			case HP<301:img.src='images/Plants/Spikerock/2.gif';
		}
	}
}),

//大蒜
oGarlic=InheritO(CPlants,{
	EName:'oGarlic',CName:'大蒜',width:60,height:59,beAttackedPointR:40,SunNum:50,HP:400,
	PicArr:['images/Card/Plants/Garlic.png','images/Plants/Garlic/0.gif','images/Plants/Garlic/Garlic.gif','images/Plants/Garlic/Garlic_body2.gif','images/Plants/Garlic/Garlic_body3.gif'],
	Tooltip:'将僵尸赶到其它的横行',Produce:'大蒜可以让僵尸改变前进的路线。<p>范围：<font color="#FF0000">近距离接触</font><br>特点：<font color="#FF0000">改变僵尸的前进路线</font></p>路线转向，这不仅仅是大蒜的专业，更是他的热情所在。他在布鲁塞尔大学里，获得了转向学的博士学位。他能把路线向量和反击阵列，讲上一整天。他甚至会把家里的东西，推到街上去。不知道为啥，他老婆还可以忍受这些。',
	CanGrow:function(AP,R,C){ //判断能否种植
		var S=R+'_'+C,P=AP[1],ArP=oS.ArP;
		return ArP?
			oGd.$LF[R]==1?C>0&&C<ArP.ArC[1]&&!(oGd.$Crater[S]||oGd.$Tombstones[S]||P):AP[0]&&!P
			:P&&P.EName=='oGarlic'?1:oGd.$LF[R]==1?!(C<1||C>9||oGd.$Crater[S]||oGd.$Tombstones[S]||P):AP[0]&&!P;
	},
	InitTrigger:function(){},HurtStatus:0,
	getHurt:function(o,AKind,Attack){
		var p=this,dP=$(p.id).childNodes[1];
		!(AKind%3)?(p.HP-=20)<1?p.Die():(o.ChangeR({R:p.R}),p.HP<134?p.HurtStatus<2&&(p.HurtStatus=2,dP.src='images/Plants/Garlic/Garlic_body3.gif'):p.HP<267&&p.HurtStatus<1&&(p.HurtStatus=1,dP.src='images/Plants/Garlic/Garlic_body2.gif')):p.Die(1);
	}
}),

//窝瓜
oSquash=InheritO(CPlants,{
	EName:'oSquash',CName:'窝瓜',width:100,height:226,beAttackedPointR:67,SunNum:50,coolTime:30,
	PicArr:['images/Card/Plants/Squash.png',
		'images/Plants/Squash/0.gif',
		'images/Plants/Squash/Squash.gif',
		'images/Plants/Squash/SquashAttack.gif',
		'images/Plants/Squash/SquashL.png',
		'images/Plants/Squash/SquashR.png'],
	AudioArr:['squash_hmm','gargantuar_thump'],
	GetDTop:145,
	Tooltip:'压扁接近的僵尸',Produce:'窝瓜会压扁第一个接近它的僵尸。<p>伤害：<font color="#FF0000">极高</font><br>范围：<font color="#FF0000">短，覆盖所有它压到的僵尸。</font><br>用法：<font color="#FF0000">单独使用</font></p>“我准备好了！”窝瓜大吼道，“干吧！！算我一份！没人比我厉害！我就是你要的人！来啊！等啥啊？要的就是这个！”',
	GetDY:function(R,C,AP){return AP[0]?-21:-10},
	getHurt:function(o,AKind,Attack){
		var p=this;
		AKind!=3?
			p.NormalAttack(p,o.id,o.ZX+o.Speed*4*(!o.WalkDirection?-1:1)-50):
			(p.HP-=Attack)<1&&p.Die(); //除了远程攻击和小丑爆炸外，窝瓜在受到攻击进行反击，并且不受伤害
	},
	getCrushed:function(){
		var p=this;
		p.NormalAttack(p,o.id,o.ZX+o.Speed*4*(!o.WalkDirection?-1:1)-50);
	},
	getTriggerRange:function(R,LX,RX){return [[LX-50,RX+80,0]]},
	TriggerCheck:function(o,d,i){
		var ZX=o.ZX,pid=this.id,img=$(pid).childNodes[1],isAttacking=o.isAttacking;
		o.beAttacked&&o.Altitude>-1&&o.Altitude<2&&
		(isAttacking||!isAttacking&&ZX-this.AttackedRX<71)
		&&(
			PlayAudio('squash_hmm'),
			oT.$[this.R].splice(i,1),
			img.src=ZX>this.AttackedRX?
				'images/Plants/Squash/SquashR.png'
				:'images/Plants/Squash/SquashL.png',
			oSym.addTask(100,function(pid,zid,pixelLeft){
				var p=$P[pid];p&&p.NormalAttack(p,o.id,pixelLeft)
			},[pid,o.id,o.ZX+o.Speed*4*(!o.WalkDirection?-1:1)-50])
		)
	}, //传递一个僵尸对象进行触发器触发条件检查，由触发器触发，不检查僵尸坐标范围。d是触发方向
	NormalAttack:function(p,zid,pixelLeft){
		var dC=$(p.id),o=$Z[zid];
		//如果僵尸还存活，则实时根据僵尸的位置计算窝瓜的落点；如果僵尸已经死了，窝瓜的落点是僵尸原地点
		o&&(pixelLeft=o.ZX+o.Speed*4*(!o.WalkDirection?-1:1)-50);
		dC.childNodes[1].src='images/Plants/Squash/SquashAttack.gif'+$Random+Math.random();
		SetStyle(dC,{left:pixelLeft+'px'});
		p.Die(1);
		oSym.addTask(45,function(dC,LX,R){
			PlayAudio('gargantuar_thump');
			var ar=oZ.getArZ(LX,LX+100,R),i=ar.length,Z;
			//while(i--)(Z=ar[i]).Altitude>-1&&Z.PZ&&Z.Altitude<3&&Z.getHurt(0,0,1800,0,0,0,2,1);
			while(i--)(Z=ar[i]).Altitude>-1&&Z.PZ&&Z.Altitude<3&&Z.getThump();
			oSym.addTask(185,ClearChild,[dC]);
		},[dC,pixelLeft,p.R]);
	}
}),

//大嘴花
oChomper=InheritO(CPlants,{
	EName:'oChomper',CName:'大嘴花',width:130,height:114,beAttackedPointR:70,SunNum:150,
	PicArr:['images/Card/Plants/Chomper.png','images/Plants/Chomper/0.gif',
			'images/Plants/Chomper/Chomper.gif',
			'images/Plants/Chomper/ChomperAttack.gif',
			'images/Plants/Chomper/ChomperDigest.gif'],
	Tooltip:'能一口气吞下一只僵尸, 但处于咀嚼状态中十分脆弱',Produce:'大嘴花可以一口吞掉一整只僵尸，但是他们消化僵尸的时候很脆弱。<p>伤害：<font color="#FF0000">巨大</font><br>范围：<font color="#FF0000">非常近</font><br>特点：<font color="#FF0000">消化时间很长</font></p>大嘴花几乎可以去“恐怖小店”，来表演它的绝技了，不过他的经纪人压榨了他太多的钱，所以他没去成。尽管如此，大嘴花没有怨言，只说了句这只是交易的一部分。',
	GetDX:function(){return -40},
	getShadow:function(o){return 'top:'+(o.height-22)+'px'},
	getTriggerRange:function(R,LX,RX){return [[this.pixelLeft,RX+80,0]]},
	TriggerCheck:function(o){this.AttackCheck2(o)&&(this.canTrigger=0,this.NormalAttack(this.id,o.id))}, //传递一个僵尸对象进行触发器触发条件检查，由触发器触发，不检查僵尸坐标范围。d是触发方向
	AttackCheck2:function(o){return o.Altitude==1&&o.beAttacked}, //非临死，行走
	NormalAttack:function(pid,zid){
		$(pid).childNodes[1].src='images/Plants/Chomper/ChomperAttack.gif'+$Random+Math.random();
		oSym.addTask(70,function(pid,zid){
			//700毫秒的攻击动画后植物还存活，则继续等待180毫秒
			$P[pid]&&oSym.addTask(18,function(pid,zid){
				var P=$P[pid],Z;
				//180毫秒后进行判断植物是否存活以及僵尸是否还可以攻击(存在，非临死，非被魅惑)
				P&&((Z=$Z[zid])&&Z.beAttacked&&Z.PZ?
					$(pid).childNodes[1].src=Z.getRaven(pid)?
						//对僵尸进行吞噬攻击成功，则改变动画为咀嚼，且等待42秒
						(oSym.addTask(4200,function(pid){
							//42秒后植物还存活，则恢复正常动画，重置触发器
							var P=$P[pid];
							P&&(P.canTrigger=1,$(pid).childNodes[1].src='images/Plants/Chomper/Chomper.gif');
						},[pid]),'images/Plants/Chomper/ChomperDigest.gif')
						//吞噬攻击失败，僵尸不可被吞噬或者是撑杆跳等，则恢复正常动画，重置为可以继续触发攻击
						:(P.canTrigger=1,'images/Plants/Chomper/Chomper.gif')
					//僵尸不存活或者临死或者被魅惑，则恢复正常状态
					:oSym.addTask(18,function(pid){
						var P=$P[pid];
						P&&(P.canTrigger=1,$(pid).childNodes[1].src='images/Plants/Chomper/Chomper.gif');
					},[pid])
				)
			},[pid,zid])
		},[pid,zid]);
	}
}),

//大喷菇
oFumeShroom=InheritO(CPlants,{
	EName:'oFumeShroom',CName:'大喷菇',width:100,height:88,beAttackedPointR:80,SunNum:75,
	BookHandBack:2,
	SleepGif:3,night:true, //标记是否夜行植物，仅供卡片提示用
	PicArr:['images/Card/Plants/FumeShroom.png','images/Plants/FumeShroom/0.gif',
			'images/Plants/FumeShroom/FumeShroom.gif',
			'images/Plants/FumeShroom/FumeShroomSleep.gif',
			'images/Plants/FumeShroom/FumeShroomAttack.gif',
			'images/Plants/FumeShroom/FumeShroomBullet.gif'],
	AudioArr:['fume'],
	Tooltip:'喷射可以穿过门板的气液',Produce:'大喷菇喷出的臭气可以穿透铁丝网门。<p>伤害：<font color="#FF0000">普通，可穿透铁丝网门</font><br>范围：<font color="#FF0000">臭气中的所有僵尸<br>白天睡觉</font></p>“我以前那份没前途的工作，是为一个面包房生产酵母孢，”大喷菇说。“然后小喷菇，上帝保佑它，告诉了我这个喷杀僵尸的机会。现在我真觉得自己完全不同了。”',
	GetDY:function(R,C,AP){return AP[0]?-5:-10},
	GetDX:function(){return -40},
	getShadow:function(o){return 'left:-8px;top:'+(o.height-20)+'px'},
	BirthStyle:function(P,id,Pn,json){
		oS.DKind&&(P.canTrigger=0,P.Sleep=1,Pn.childNodes[1].src=P.PicArr[P.SleepGif]);
		EditEle(Pn,{id:id},json,EDPZ);
	},
	PrivateBirth:function(P){ //创建一个子弹层
		var pid=P.id;
		NewEle(pid+'_Bullet','div','position:absolute;visibility:hidden;width:343px;height:62px;left:'+P.AttackedRX+'px;top:'+(P.pixelTop+5)+'px;background:url(images/Plants/FumeShroom/FumeShroomBullet.gif);z-index:'+(P.zIndex+1),0,EDPZ);
	},
	PrivateDie:function(o){ClearChild($(o.id+'_Bullet'))},
	getTriggerRange:function(R,LX,RX){return [[LX,Math.min(RX+330,oS.W),0]]},
	NormalAttack:function(){//id,EleN,cssText,pro,append
		PlayAudio('fume');
		var P=this,ar=oZ.getArZ(P.AttackedLX,Math.min(P.AttackedRX+330,oS.W),P.R),
			i=ar.length,Z,pid=P.id,dC=$(pid),BID=pid+'_Bullet';
		while(i--)(Z=ar[i]).Altitude<2&&Z.getHit1(Z,20);
		dC.childNodes[1].src='images/Plants/FumeShroom/FumeShroomAttack.gif';
		SetVisible($(BID)); //显示装载子弹背景图片的div层
		//调用循环移动背景图片的计时器
		ImgSpriter(BID,pid,[['0 0',9,1],['0 -62px',9,2],['0 -124px',9,3],['0 -186px',9,4],['0 -248px',9,5],['0 -310px',9,6],['0 -372px',9,7],['0 -434px',9,-1]],0,function(BID,pid){
			var dC=$(pid);
			$P[pid]&&(
				dC.childNodes[1].src='images/Plants/FumeShroom/FumeShroom.gif',
				SetHidden($(BID))
			);
		});
	}
}),

//咖啡豆
oCoffeeBean=InheritO(CPlants,{
	EName:'oCoffeeBean',CName:'咖啡豆',width:39,height:97,beAttackedPointL:10,beAttackedPointR:29,SunNum:75,PKind:3,canEat:0,
	PicArr:['images/Card/Plants/CoffeeBean.png','images/Plants/CoffeeBean/0.gif','images/Plants/CoffeeBean/CoffeeBean.gif','images/Plants/CoffeeBean/CoffeeBeanEat.gif'+$Random],
	AudioArr:['coffee','wakeup'],
	Tooltip:'唤醒在白天里睡觉的蘑菇类植物',Produce:'咖啡豆，可以唤醒睡眠中的蘑菇们。<p>使用方法：<font color="#FF0000">单独使用，立即生效</font><br>特点：<font color="#FF0000">可以种在其他植物上，用来唤醒蘑菇们</font></p>咖啡豆：“嘿，伙计们！嘿，怎么回事？是谁？嘿！你瞧见那个东西没？什么东西？哇！是狮子！”嗯，咖啡豆确定，这样可以让自己很兴奋。',
	InitTrigger:function(){},
	GetDBottom:function(){return 49},
	GetDY:function(){return -30},
	CanGrow:function(AP,P){return (P=AP[1])&&P.Sleep&&!AP[3]},	//有普通植物且休眠且无咖啡豆
	BirthStyle:function(P,id,Pn,json){
		Pn.childNodes[1].src=this.PicArr[3]+Math.random();
		EditEle(Pn,{id:id},json,EDPZ);
	},
	PrivateBirth:function(o){
		SetHidden($(o.id).firstChild);
		PlayAudio('coffee');
		oSym.addTask(240,function(S){
			PlayAudio('wakeup');
			var P=oGd.$[S],W;
			P&&(
				W=P.WakeUP,
				(!W?($(P.id).childNodes[1].src=P.PicArr[P.NormalGif],P.canTrigger=1,P.Sleep=0):W(P))
			);
			o.Die();
		},[o.R+'_'+o.C+'_1'])
	}
}),

//忧郁菇
oGloomShroom=InheritO(oFumeShroom,{
	EName:'oGloomShroom',CName:'曾哥',width:88,height:83,beAttackedPointR:68,SunNum:150,coolTime:50,
	PicArr:['images/Card/Plants/GloomShroom.png','images/Plants/GloomShroom/0.gif',
			'images/Plants/GloomShroom/GloomShroom.gif',
			'images/Plants/GloomShroom/GloomShroomSleep.gif',
			'images/Plants/GloomShroom/GloomShroomAttack.gif',
			'images/Plants/GloomShroom/GloomShroomBullet.gif'],
	AudioArr:['kernelpult','kernelpult2'],
	Tooltip:'围绕自身释放大量绵羊音<br>(需要大喷菇)',Produce:'伪娘终结者，喜欢围绕自身释放大量绵羊音<p><font color="#FF0000">必须种植在大喷菇上</font></p>起初人们一直非议他，后来曾哥用自己独特的绵羊音横扫了宇宙拆迁办，全世界都拜倒在他的脚下。“听说有个节目叫‘快男’？”曾哥说，“没有我在他们真应该感到羞愧。”他于是决定明年去看看。',
	CanGrow:function(AP,R,C){ //判断能否种植
		var P=AP[1];return P&&P.EName=='oFumeShroom';
	},
	BirthStyle:function(P,id,Pn,json){
		oGd.$[P.R+'_'+P.C+'_1'].Sleep&&(P.canTrigger=0,P.Sleep=1,Pn.childNodes[1].src=P.PicArr[3]);
		EditEle(Pn,{id:id},json,EDPZ);
	},
	GetDX:CPlants.prototype.GetDX,
	PrivateBirth:function(P){
		var pid=P.id;
		NewEle(pid+'_Bullet','div','position:absolute;visibility:hidden;width:210px;height:200px;left:'+(P.pixelLeft-60)+'px;top:'+(P.pixelTop-65)+'px;background:url(images/Plants/GloomShroom/GloomShroomBullet.gif);z-index:'+(P.zIndex+1),0,EDPZ);
	},
	PrivateDie:function(o){ClearChild($(o.id+'_Bullet'))},
	getTriggerRange:function(R,LX,RX){
		var X=GetX(this.C),X1=this.MinX=X-120,X2=this.MaxX=X+120;
		return [[X1,X2,0]];
	},
	getTriggerR:function(R){
		var R1=this.MinR=R>2?R-1:1,R2=this.MaxR=R<oS.R?Number(R)+1:R;
		return [R1,R2];
	},
	NormalAttack:function(){ //{2:[[1,100,0],[120,220,0]],3:[[1,100,0]]}
		var P=this,R,RMax=P.MaxR,X1=P.MinX,X2=P.MaxX,ar,i,Z,pid=P.id,dC=$(pid),BID=pid+'_Bullet';
		for(R=P.MinR;R<=RMax;R++){
			ar=oZ.getArZ(X1,X2,R);
			for(i=ar.length;i--;(Z=ar[i]).Altitude<2&&Z.getHit1(Z,80));
		}
		oSym.addTask(100,function(T){
			PlayAudio(['kernelpult','kernelpult2'][Math.floor(Math.random()*2)]);
			--T&&oSym.addTask(100,arguments.callee,[T]);
		},[4]);
		dC.childNodes[1].src='images/Plants/GloomShroom/GloomShroomAttack.gif';
		SetVisible($(BID));
		ImgSpriter(BID,pid,[['0 0',9,1],['0 -200px',9,2],['0 -400px',9,3],['0 -600px',9,4],['0 -800px',9,5],['0 -1000px',9,6],['0 -1200px',9,7],['0 -1400px',9,8],['0 -1600px',9,9],['0 -1800px',9,10],['0 -2000px',9,11],['0 -2200px',9,-1]],0,function(BID,pid){
			var dC=$(pid);
			$P[pid]&&(dC.childNodes[1].src='images/Plants/GloomShroom/GloomShroom.gif');
			SetHidden($(BID));
		});
	}
}),

//小喷菇
oPuffShroom=InheritO(oFumeShroom,{
	EName:'oPuffShroom',CName:'小喷菇',width:40,height:66,beAttackedPointL:15,beAttackedPointR:25,SunNum:0,Stature:-1,
	PicArr:['images/Card/Plants/PuffShroom.png','images/Plants/PuffShroom/0.gif',
			'images/Plants/PuffShroom/PuffShroom.gif',
			'images/Plants/PuffShroom/PuffShroomSleep.gif',
			'images/Plants/ShroomBullet.gif',
			'images/Plants/ShroomBulletHit.gif'],
	AudioArr:['puff'],
	Tooltip:'向敌人发射短程孢子',Produce:'小喷菇是免费的，不过射程很近。<p>伤害：<font color="#FF0000">中等</font><br>范围：<font color="#FF0000">近<br>白天要睡觉</font></p>小喷菇：“我也是最近才知道僵尸的存在，和很多蘑菇一样，我只是把他们想象成童话和电影里的怪物。不过这次的经历已经让我大开眼界了。',
	GetDX:CPlants.prototype.GetDX,
	getShadow:function(o){return 'left:-20px;top:46px'},
	getTriggerRange:function(R,LX,RX){return [[LX,Math.min(RX+250,oS.W),0]]},
	PrivateBirth:function(o){o.BulletEle=NewImg(0,'images/Plants/ShroomBullet.gif','left:'+(o.AttackedLX-46)+'px;top:'+(o.pixelTop+40)+'px;visibility:hidden;z-index:'+(o.zIndex+2))},
	PrivateDie:function(o){o.BulletEle=null},
	NormalAttack:function(){
		PlayAudio('puff');
		var o=this,id='PSB'+Math.random(),LX=o.AttackedLX;
		EditEle(o.BulletEle.cloneNode(false),{id:id},0,EDPZ);
		oSym.addTask(15,function(id){var o=$(id);o&&SetVisible(o)},[id]);
		oSym.addTask(1,function(id,img,OX,R,pixelLeft){ //移动蘑菇类子弹
			var C=GetC(OX),Z=oZ.getZ0(OX,R);
			Z&&Z.Altitude==1?(
				Z.getPea(Z,20,0),
				(SetStyle(img,{left:pixelLeft+38+'px',width:'52px',height:'46px'})).src='images/Plants/ShroomBulletHit.gif',
				oSym.addTask(10,ClearChild,[img])
			):(OX+=5)<oS.W?(
				img.style.left=(pixelLeft+=5)+'px',
				oSym.addTask(1,arguments.callee,[id,img,OX,R,pixelLeft])
			):ClearChild(img);
		},[id,$(id),LX,o.R,LX-46]);
	}
}),

//胆小菇
oScaredyShroom=InheritO(oFumeShroom,{
	EName:'oScaredyShroom',CName:'胆小菇',width:57,height:81,beAttackedPointR:37,SunNum:25,
	Cry:0,ArZ:[],Attacking:0,
	PicArr:['images/Card/Plants/ScaredyShroom.png','images/Plants/ScaredyShroom/0.gif',
			'images/Plants/ScaredyShroom/ScaredyShroom.gif',
			'images/Plants/ScaredyShroom/ScaredyShroomSleep.gif',
			'images/Plants/ScaredyShroom/ScaredyShroomCry.gif',
			'images/Plants/ShroomBullet.gif',
			'images/Plants/ShroomBulletHit.gif'],
	Tooltip:'远程射手, 但敌人靠近时会蜷缩不动',Produce:'胆小菇是一种远程射手，敌人接近后会躲起来。<p>伤害：<font color="#FF0000">普通</font><br>特点：<font color="#FF0000">敌人接近后就停止攻击<br>白天睡觉</font></p>“谁在那？”胆小菇低声说，声音细微难辨。“走开！我不想见任何人。除非……除非你是马戏团的人。”',
	GetDX:CPlants.prototype.GetDX,
	getTriggerRange:CPlants.prototype.getTriggerRange,
	getTriggerR:function(R){
		var R1=this.MinR=R>2?R-1:1,R2=this.MaxR=R<oS.R?Number(R)+1:R;
		return [R1,R2];
	},
	TriggerCheck:function(o,d){
		var P=this,pid=P.id;
		o.PZ&&Math.abs(o.ZX-P.MX)<121&&o.beAttacked? //僵尸靠近并且僵尸非临死
			//加入僵尸到靠近僵尸数组中，如果胆小菇是正常状态，则哭泣，并且进入靠近敌人检查循环判断
			(P.ArZ.push(o.id),!P.Cry&&(P.Cry=1,$(pid).childNodes[1].src='images/Plants/ScaredyShroom/ScaredyShroomCry.gif',P.CryCheck(pid)))
			//如果胆小菇是正常状态且非正在攻击且僵尸是行走或者跳跃，开始攻击
			:(o.R==P.R&&!P.Cry&&!P.Attacking&&o.Altitude>0&&o.Altitude<3&&P.NormalAttack());
	},
	PrivateBirth:function(o){
		var LX=o.AttackedLX,pixelLeft=LX-46;
		o.BulletClass=NewO({X:LX,R:o.R,pixelLeft:pixelLeft,F:oGd.MB2});
		o.BulletEle=NewImg(0,'images/Plants/ShroomBullet.gif','left:'+pixelLeft+'px;top:'+(o.pixelTop+35)+'px;visibility:hidden;z-index:'+(o.zIndex+2));
		o.MX=LX+9;
	},
	PrivateDie:function(o){o.BulletEle=null},
	NormalAttack:function(){
		var o=this,pid=o.id,id='SSB'+Math.random(),LX=o.AttackedLX;
		EditEle(o.BulletEle.cloneNode(false),{id:id},0,EDPZ);
		oSym.addTask(1,function(id,img,OX,R,pixelLeft){ //移动蘑菇类子弹
			var C=GetC(OX),Z=oZ.getZ0(OX,R);
			Z&&Z.Altitude==1?(
				Z.getPea(Z,20,0),
				(SetStyle(img,{left:pixelLeft+38+'px',width:'52px',height:'46px'})).src='images/Plants/ShroomBulletHit.gif',
				oSym.addTask(10,ClearChild,[img])
			):(OX+=5)<oS.W?(
				img.style.left=(pixelLeft+=5)+'px',
				oSym.addTask(1,arguments.callee,[id,img,OX,R,pixelLeft])
			):ClearChild(img);
		},[id,$(id),LX,o.R,LX-46]);
		o.Attacking=1;
		oSym.addTask(10,function(id,pid){
			var o=$(id);
			o&&SetVisible(o);
			oSym.addTask(130,function(pid){
				var o=$P[pid];
				o&&(o.Attacking=0);
			},[pid]);
		},[id,pid]);
	},
	CryCheck:function(pid){ //检查靠近敌人数组
		oSym.addTask(140,function(pid){
			var P=$P[pid],i,ArZ,Z;
			if(P){
				i=(ArZ=P.ArZ).length;
				//僵尸不存在或者僵尸范围超出，移除
				while(i--)(!(Z=$Z[ArZ[i]])||!Z.PZ||Math.abs(Z.ZX-P.MX)>120)&&ArZ.splice(i,1);
				//是否还有靠近僵尸，有则继续进行靠近判断，无则回复正常
				ArZ.length?P.CryCheck(pid):(P.Cry=0,$(pid).childNodes[1].src='images/Plants/ScaredyShroom/ScaredyShroom.gif');
			}
		},[pid]);
	}
}),

//魅惑菇
oHypnoShroom=InheritO(oFumeShroom,{
	EName:'oHypnoShroom',CName:'魅惑菇',width:71,height:78,beAttackedPointL:10,beAttackedPointR:61,SunNum:75,coolTime:30,
	PicArr:['images/Card/Plants/HypnoShroom.png','images/Plants/HypnoShroom/0.gif',
		'images/Plants/HypnoShroom/HypnoShroom.gif',
		'images/Plants/HypnoShroom/HypnoShroomSleep.gif'],
	Tooltip:'让一只僵尸为你作战',Produce:'当僵尸吃下魅惑菇后，他将会掉转方向为你作战。<p>使用方法：<font color="#FF0000">单独使用，接触生效</font><br>特点：<font color="#FF0000">让一只僵尸为你作战<br>白天睡觉</font></p>魅惑菇声称：“僵尸们是我们的朋友，他们被严重误解了，僵尸们在我们的生态环境里扮演着重要角色。我们可以也应当更努力地让他们学会用我们的方式来思考。”',
	InitTrigger:function(){},
	getHurt:function(o,AKind,Attack){
		var p=this;
		switch(AKind){
			case 3:
				(p.HP-=Attack)<1&&p.Die();
				break;
			case 0:
				!p.Sleep&&o.bedevil(o); //未睡眠被吃，魅惑僵尸
				p.Die();
				break;
			default:
				p.Die(1);
		}
	}
}),

//寒冰菇
oIceShroom=InheritO(oFumeShroom,{
	EName:'oIceShroom',CName:'寒冰菇',width:83,height:75,beAttackedPointR:63,SunNum:75,
	coolTime:0,
	PicArr:['images/Card/Plants/IceShroom.png','images/Plants/IceShroom/0.gif',
		'images/Plants/IceShroom/IceShroom.gif',
		'images/Plants/IceShroom/IceShroomSleep.gif',
		'images/Plants/IceShroom/Snow.gif',
		'images/Plants/IceShroom/icetrap.gif'],
	AudioArr:['frozen','wakeup'],
	Tooltip:'暂时使画面里的所有敌人停止行动',Produce:'寒冰菇，能短暂的冻结屏幕上所有僵尸。<p>伤害：<font color="#FF0000">非常低，冻结僵尸</font><br>范围：<font color="#FF0000">屏幕上的所有僵尸</font><br>用法：<font color="#FF0000">单独使用，立即生效<br>白天睡觉</font></p>寒冰菇皱着眉头，倒不是因为它不高兴或不满意，只是因为，它儿时因受创伤而遗留下了面瘫。',
	GetDX:CPlants.prototype.GetDX,GetDY:CPlants.prototype.GetDY,
	InitTrigger:function(){},
	PrivateDie:function(o){},
	PrivateBirth:function(P){
		!oS.DKind?(
			P.NormalAttack(P.id),
			P.getHurt=function(o,AKind,Attack){}
		):P.getHurt=CPlants.prototype.getHurt;
	},
	WakeUP:function(p){
		var id=p.id;
		p.Sleep=0;
		$(id).childNodes[1].src='images/Plants/IceShroom/IceShroom.gif';
		p.NormalAttack(id);
	},
	NormalAttack:function(pid){
		oSym.addTask(100,function(pid){
			var p=$P[pid];
			if(p){
				PlayAudio('frozen');
				var Z,ZID,ID='Snow_'+Math.random();
				for(ZID in $Z){(Z=$Z[ZID]).ZX<901&&Z.getFreeze(Z,ZID);}
				oSym.addTask(40,function(o){ClearChild(o)},[NewEle(ID,'div','position:absolute;left:0;top:0;width:900px;height:600px;z-index:10;filter:alpha(opacity=50);opacity:.5;background:#9CF url(images/Plants/IceShroom/Snow.gif) no-repeat scroll '+(p.pixelLeft-197)+'px '+(p.pixelTop-80)+'px',0,EDPZ)]);
				p.Die();
			}
		},[pid]);
	}
}),

//阳光菇
oSunShroom=InheritO(oFumeShroom,{
	EName:'oSunShroom',CName:'阳光菇',width:59,height:61,beAttackedPointL:15,beAttackedPointR:44,SunNum:25,Stature:-1,
	Status:0,
	PicArr:['images/Card/Plants/SunShroom.png','images/Plants/SunShroom/0.gif',
			'images/Plants/SunShroom/SunShroom2.gif',
			'images/Plants/SunShroom/SunShroomSleep.gif',
			'images/Plants/SunShroom/SunShroom.gif'],
	Tooltip:'开始提供少量的阳光, 一段时间后提供正常量的阳光',Produce:'阳光菇开始提供少量阳光，稍后提供正常数量阳光。<p>生产阳光：<font color="#FF0000">开始低，之后正常<br>白天睡觉</font></p>阳光菇讨厌阳光。恨到当它内部产生点阳光时，就尽可能快的吐出来。它就是不能忍受这个。对它来说，阳光令人厌恶。',
	GetDX:CPlants.prototype.GetDX,GetDY:CPlants.prototype.GetDY,
	AudioArr:['plantgrow'],
	InitTrigger:function(){},
	PrivateDie:function(o){},
	PrivateBirth:function(){},
	BirthStyle:function(P,id,Pn,json){
		oS.DKind?
			(P.canTrigger=0,P.Sleep=1,Pn.childNodes[1].src='images/Plants/SunShroom/SunShroomSleep.gif')
			:(oSym.addTask(600,function(id,X,Y){
				var P=$P[id];
				P&&P.ProduceSun(P,X,Y);
			},[id,GetX(P.C)-40,GetY(P.R)]),
			oSym.addTask(12000,function(id){ //长大
				var P=$P[id];
				P&&(
					PlayAudio('plantgrow'),
					P.Sleep=0,
					$(id).childNodes[1].src='images/Plants/SunShroom/SunShroom.gif',
					P.Status=1
				);
			},[id])
		);
		EditEle(Pn,{id:id},json,EDPZ);
	},
	ProduceSun:function(P,X,Y){
		AppearSun(Math.floor(X+Math.random()*41),Y,!P.Status?15:25,0), //产生阳光
		oSym.addTask(2400,function(id,X,Y){
			var P=$P[id];
			P&&P.ProduceSun(P,X,Y);
		},[P.id,X,Y]) //增加新任务24秒后执行自身
	},
	WakeUP:function(o){var id=o.id;
		o.ProduceSun(o,GetX(o.C)-40,GetY(o.R));
		$(id).childNodes[1].src='images/Plants/SunShroom/SunShroom2.gif';
		o.Sleep=0;
		oSym.addTask(12000,function(id){
			var P=$P[id];
			P&&($(id).childNodes[1].src='images/Plants/SunShroom/SunShroom.gif',P.Status=1);
		},[id]);
	}
}),

//毁灭菇
oDoomShroom=InheritO(oFumeShroom,{
	EName:'oDoomShroom',CName:'毁灭菇',width:102,height:91,beAttackedPointR:80,coolTime:50,SunNum:125,
	PicArr:['images/Card/Plants/DoomShroom.png','images/Plants/DoomShroom/0.gif',
			'images/Plants/DoomShroom/DoomShroom.gif',
			'images/Plants/DoomShroom/Sleep.gif',
			'images/Plants/DoomShroom/BeginBoom.gif',
			'images/Plants/DoomShroom/crater10.png',
			'images/Plants/DoomShroom/crater11.png',
			'images/Plants/DoomShroom/crater20.png',
			'images/Plants/DoomShroom/crater21.png',
			'images/Plants/DoomShroom/crater30.png',
			'images/Plants/DoomShroom/crater31.png',
			'images/Plants/DoomShroom/Boom.png'],
	Tooltip:'造成大规模的伤害, 但会在原地留下一个坑, 坑中无法种植物',Produce:'毁灭菇可以摧毁大范围的僵尸，并留下一个不能种植物的大弹坑。<p>伤害：<font color="#FF0000">极高</font><br>范围：<font color="#FF0000">大范围内的所有僵尸</font><br>用法：<font color="#FF0000">单独使用，立即生效</font><br>特点：<font color="#FF0000">留下一个弹坑<br>白天睡觉</font></p>“你很幸运，我是和你一伙的，”毁灭菇说，“我能摧毁任何你所珍视的东西，小菜一碟。”',
	InitTrigger:function(){},
	AudioArr:['doomshroom'],
	BirthStyle:function(P,id,Pn,json){
		oS.DKind?(
			P.Sleep=1,
			Pn.childNodes[1].src=P.PicArr[P.SleepGif]
		):(
			P.Sleep=0,
			P.getHurt=function(){},
			Pn.childNodes[1].src='images/Plants/DoomShroom/BeginBoom.gif',
			P.NormalAttack(id)
		)
		EditEle(Pn,{id:id},json,EDPZ);
	},
	WakeUP:function(p){
		var id=p.id;
		p.Sleep=0;
		p.getHurt=function(){};
		p.getCrushed=function(){};
		$(id).childNodes[1].src='images/Plants/DoomShroom/BeginBoom.gif';
		p.NormalAttack(id);
	},
	NormalAttack:function(id){
		oSym.addTask(100,function(id){
			var p=$P[id],did=id+'_Boom';
			if(p){
				var dC=$(id),R=p.R,R1=R>3?R-2:1,R2=Math.min(oS.R,R+2),LX=p.pixelLeft-240,RX=p.pixelRight+240,ar,i,C=GetC(p.AttackedLX),p2,s=R+'_'+C,_$=oGd.$;
				do{i=(ar=oZ.getArZ(LX,RX,R1)).length;
					while(i--)ar[i].getExplosion();
				}while(R1++<R2);
				PlayAudio('doomshroom');
				p.Die();
				(p2=_$[s+'_'+0])&&p2.Die(); //容器植物死亡
				(p2=_$[s+'_'+2])&&p2.Die(); //南瓜死亡
				oGd.$Crater[s]=2; //形成弹坑
				//爆炸的蘑菇云动画
				NewEle(did,'div','position:absolute;overflow:hidden;z-index:'+(p.zIndex+2)+';width:283px;height:324px;left:'+(p.pixelLeft-80)+'px;top:'+(p.pixelTop-220)+'px;background:url(images/Plants/DoomShroom/Boom.png) no-repeat',0,EDPZ);
				//爆炸瞬间整个屏幕变亮
				oSym.addTask(20,function(img){ClearChild(img)},[NewEle(did,'div','position:absolute;z-index:20;width:900px;height:600px;left:0;top:0;background:#FFF;*filter:alpha(opacity=50);opacity:.5',0,EDPZ)]);
				//蘑菇云动画模拟
				ImgSpriter(did,id,[['0 0',10,1],['-283px 0',10,2],['-566px 0',10,3],['-849px 0',10,4],['-1132px 0',10,5],['-1415px 0',10,6],['-1698px 0',10,7],['-1981px 0',10,8],['-2264px 0',10,9],['-2547px 0',10,-1]],0,function(BID,pid){
					ClearChild($(BID));
					p.setCrater(id+'_crater',R,C,p.pixelLeft+3,p.pixelTop+50); //83  273
				});
			}
		},[id]);
	},
	//制造弹坑图片，传递id,R,C,弹坑坐标，未传递弹坑坐标，使用默认GetX,GetY
	setCrater:function(id,R,C,X,Y){
		var img;
		switch(oGd.$LF[R]){ //地形
			case 1: //草地
				img=NewEle(id,'div','position:absolute;z-index:'+(3*R-1)+';overflow:hidden;background:url(images/Plants/DoomShroom/crater1'+oS.DKind+'.png) no-repeat;width:90px;height:61px;left:'+(X||(GetX(C)-45))+'px;top:'+(Y||(GetY(R)-30))+'px',0,EDPZ);
				break;
			case 2: //水池
				img=NewEle(id,'div','position:absolute;z-index:'+(3*R-1)+';overflow:hidden;background:url(images/Plants/DoomShroom/crater2'+oS.DKind+'.png) no-repeat;width:85px;height:53px;left:'+(X||(GetX(C)-42))+'px;top:'+(Y||(GetY(R)-26))+'px',0,EDPZ);
				break;
			default: //屋顶
		}
		oSym.addTask(9000,function(img){ //90秒后淡化
			var s=R+'_'+C;
			img.style.backgroundPosition='100% 0';
			oGd.$Crater[s]=1;
			oSym.addTask(9000,function(img,s){ //90秒后消失
				ClearChild(img);
				delete oGd.$Crater[s];
			},[img,s]);
		},[img]);
	}
}),

//缠绕海草
oTangleKlep=InheritO(CPlants,{
	EName:'oTangleKlep',CName:'缠绕海草',width:90,height:72,beAttackedPointL:15,beAttackedPointR:80,coolTime:30,SunNum:25,
	BookHandBack:4,
	GetDY:function(R,C,AP){return 5},NormalGif:1,
	PicArr:['images/Card/Plants/TangleKlep.png','images/Plants/TangleKlep/0.gif',
			'images/Plants/TangleKlep/Float.gif',
			'images/Plants/TangleKlep/Grab.png',
			'images/interface/splash.png'],
	Tooltip:'可以将僵尸拉入水底的水生植物',Produce:'缠绕水草是一种可以把接近他的僵尸拉进水中的水生植物。<p>伤害：<font color="#FF0000">极高</font><br>用法：<font color="#FF0000">单独使用，接触后生效</font><br>特点：<font color="#FF0000">必须种在水中</font></p>“我是完全隐形的，”缠绕水草自己想，“我就藏在水面下，没人会看到我。”他的朋友告诉他，他们可以清楚地看到他。不过，缠绕水草似乎不想改变自己的看法。',
	CanGrow:function(AP,R,C){
		var S=R+'_'+C;
		return !(oGd.$LF[R]!=2||C<1||C>9||oGd.$Crater[S]||AP[0]||AP[1]);
		//必须是水池，不超出范围，无弹坑，无容器，无普通植物
	},
	getShadow:function(o){return 'display:none'}, //影子不可见
	getTriggerRange:function(R,LX,RX){return [[LX,RX,0]]},
	BirthStyle:function(P,id,Pn,json){
		Pn.childNodes[1].src='images/Plants/TangleKlep/Float.gif';
		EditEle(Pn,{id:id},json,EDPZ);
	},
	getHurt:function(o,AKind,Attack){ //受伤害函数替换
		var p=this;
		AKind==3?(p.HP-=Attack)<1&&p.Die():(p.canTrigger=0,p.NormalAttack(p,o));
	},
	TriggerCheck:function(o,d){ //传递一个僵尸对象进行触发器触发条件检查，由触发器触发，不检查僵尸坐标范围。d是触发方向
		o.AttackedLX<GetX(9)&&o.beAttacked&&(this.canTrigger=0,this.NormalAttack(this,o))
	},
	NormalAttack:function(p,z){
		p.getHurt=function(){}; //海草受伤事件置空
		z.getHurt=function(){}; //僵尸受伤事件置空
		z.beAttacked=0; //僵尸可攻击设置为0，不可再受其他攻击
		z.isAttacking=1; //僵尸不可攻击
		//添加一个触手的图片在僵尸的层里
		NewImg(0,'images/Plants/TangleKlep/Grab.png','left:'+z.beAttackedPointL+'px;top:'+(z.height-67)+'px',z.Ele);
		//半秒后植物和僵尸死亡，生成水花
		oSym.addTask(50,function(p,z){
			var pid=p.id,zid=z.id,sid=pid+'_splash',sid2=zid+'_splash';
			NewEle(sid,'div','position:absolute;background:url(images/interface/splash.png);left:'+(p.pixelLeft-4)+'px;top:'+(p.pixelTop-16)+'px;width:97px;height:88px;over-flow:hidden',0,EDPZ);
			NewEle(sid2,'div','position:absolute;background:url(images/interface/splash.png);left:'+(z.AttackedLX-10)+'px;top:'+(z.pixelTop+z.height-88)+'px;width:97px;height:88px;over-flow:hidden',0,EDPZ);
			ImgSpriter(sid,pid,[['0 0',9,1],['-97px 0',9,2],['-194px 0',9,3],['-291px 0',9,4],['-388px 0',9,5],['-485px 0',9,6],['-582px 0',9,7],['-679px 0',9,-1]],0,function(BID,pid){ClearChild($(BID))});
			ImgSpriter(sid2,zid,[['0 0',9,1],['-97px 0',9,2],['-194px 0',9,3],['-291px 0',9,4],['-388px 0',9,5],['-485px 0',9,6],['-582px 0',9,7],['-679px 0',9,-1]],0,function(BID,pid){ClearChild($(BID))});
			z.DisappearDie(); //直接移除僵尸图片
			p.Die(); //直接移除植物图片
		},[p,z]);
	}
}),

//海蘑菇
oSeaShroom=InheritO(oPuffShroom,{
	EName:'oSeaShroom',CName:'海蘑菇',width:48,height:99,beAttackedPointL:10,beAttackedPointR:40,coolTime:30,BookHandBack:3,
	PicArr:['images/Card/Plants/SeaShroom.png','images/Plants/SeaShroom/0.gif',
			'images/Plants/SeaShroom/SeaShroom.gif',
			'images/Plants/SeaShroom/SeaShroomSleep.gif',
			'images/Plants/ShroomBullet.gif',
			'images/Plants/ShroomBulletHit.gif'],
	CanGrow:function(AP,R,C){ //判断能否种植
		var S=R+'_'+C;
		return !(C<1||C>9||oGd.$LF[R]-2||AP[0]||AP[1]||oGd.$Crater[S]);
		//C在范围内，是水池，没容器，没普通植物，没弹坑
	},
	getShadow:function(o){return 'left:0:top:0;display:none'},
	Tooltip:'发射短距离孢子的水生植物',Produce:'海蘑菇，能够发射短程孢子的水生植物。<p>伤害：<font color="#FF0000">普通</font><br>射程：<font color="#FF0000">短<br>必须种在水上<br>白天睡觉</font></p>海蘑菇从来没看到过大海，大海就在他的名字里，他总听到关于大海的事。他只是没找到合适的时间，总有一天……是的，他会见到海的。'
}),

//灯笼草
oPlantern=InheritO(CPlants,{
	EName:'oPlantern',CName:'灯笼草',width:250,height:237,beAttackedPointL:105,beAttackedPointR:145,coolTime:30,BookHandBack:2,SunNum:25,
	PicArr:['images/Card/Plants/Plantern.png','images/Plants/Plantern/0.gif','images/Plants/Plantern/Plantern.gif','images/Plants/Plantern/light.gif'],
	Tooltip:'照亮一片区域, 让玩家可以看穿战场迷雾',Produce:'灯笼草，能照亮一片区域，让你看清战场迷雾<p>范围：<font color="#FF0000">一片圆形区域</font><br>特点：<font color="#FF0000">使你看清战场迷雾</font></p>灯笼草拒绝科学，他只会埋头苦干。其他植物吃的是光，挤出的是氧气。灯笼草吃的是黑暗，挤出的却是光。对于他如何能产生光这件事，灯笼草持谨慎态度。“我不会说这是‘巫术’，我也不会使用‘黑暗力量’，我只是……我想我说得够多的了。”',
	PrivateBirth:function(o){
		var R=o.R,C=o.C;
		oGd.$Plantern[R+'_'+C]=o.id; //设置灯笼草标记
		NewImg('','images/Plants/Plantern/light.gif','filter:alpha(opacity=30);opacity:.3;left:0;top:0;z-index:'+o.zIndex,$(o.id));
		oS.HaveFog&&oGd.GatherFog(R,C,2,3,0); //在有雾的关卡驱散雾
	},
	InitTrigger:function(){},
	PrivateDie:function(o){
		var R=o.R,C=o.C;
		delete oGd.$Plantern[R+'_'+C];
		oS.HaveFog&&oGd.GatherFog(R,C,2,3,1); //在有雾的关卡聚拢雾
	},
	GetDY:function(R,C,AP){return AP[0]?70:74},
	getShadow:function(o){return 'left:'+(o.width*.5-43)+'px;top:'+(o.height-100)+'px'} //用于初始化模板时返回影子样式
}),

//仙人掌
oCactus=InheritO(CPlants,{
	EName:'oCactus',CName:'仙人掌',width:122,height:157,SunNum:125,beAttackedPointL:10,beAttackedPointR:80,
	AudioArr:['plantgrow'],Status:0, //0缩短1伸长
	PicArr:(function(){return ['images/Card/Plants/Cactus.png','images/Plants/Cactus/0.gif','images/Plants/Cactus/Cactus.gif','images/Plants/Cactus/Cactus2.gif','images/Plants/Cactus/Attack.gif','images/Plants/Cactus/Attack2.gif','images/Plants/Cactus/Elongation.gif','images/Plants/Cactus/Shorten.gif','images/Plants/Cactus/Projectile'+($User.Browser.IE6?8:32)+'.png']})(),
	Tooltip:'能发射刺穿气球的子弹',Produce:'仙人掌发射的穿刺弹可以用来打击地面和空中目标<p>伤害：<font color="#FF0000">中等</font><br>范围：<font color="#FF0000">地面和空中</font></p>确实，仙人掌非常“刺儿”，但是她的刺下，隐藏藏着颗温柔的心，充满着爱和善良。她只是想拥抱别人，和被别人拥抱。大多数人都做不到这点，但是仙人掌她并不介意。她盯着一只铠甲鼠好一阵子了，这次好像真的可以抱抱了。',
	getShadow:function(o){return 'left:3px;top:132px'},
	PrivateBirth:function(o){o.ES=o.Elongation},
	TriggerCheck:function(o,d){this.ES()&&(this.canTrigger=0,this.CheckLoop(o.id,d));},
	CheckLoop:function(zid,d){ //普通状态的循环检查攻击条件
		var pid=this.id;
		this.NormalAttack(zid);
		this.ES();
		this.Status==0&&oSym.addTask(140,function(pid,zid,d){
			var p;
			(p=$P[pid])&&p.ES()&&p.AttackCheck1(zid,d);
		},[pid,zid,d]);
	},
	CheckLoop2:function(zid,d){ //伸长状态的循环检查攻击条件
		var pid=this.id;
		this.NormalAttack(zid);
		this.ES();
		this.Status&&oSym.addTask(140,function(pid,zid,d){
			var p;
			(p=$P[pid])&&p.ES()&&p.AttackCheck12(zid,d);
		},[pid,zid,d]);
	},
	AttackCheck1:function(zid,d){ //普通状态的1检查
		var o=this,T=o.oTrigger,Z=$Z[zid],rT,i,ZX,iT;
		if(Z&&Z.PZ&&(rT=T[Z.R])){
			ZX=Z.ZX;
			i=rT.length;
			while(i--){
				iT=rT[i];
				if(iT[0]<=ZX&&iT[1]>=ZX&&Z.Altitude>0){o.CheckLoop(zid,iT[2]);return;}
			}
		}
		o.canTrigger=1;
	},
	AttackCheck12:function(zid,d){ //伸长状态的1检查
		var o=this;
		o.CheckLoop(zid,d);
	},
	Elongation:function(){
		//普通状态判断行是否有气球,有气球则伸长，返回假；无则返回真
		var P=this,id=P.id;
		if(!oGd.$Balloon[P.R]>0){ //本行没有气球
			//触发攻击的僵尸是行走跳跃.
			return true;
		}else{ //有气球，转变成伸长状态攻击
			PlayAudio('plantgrow');
			P.canTrigger=0; //伸缩过程不受触发
			P.Status=1;
			$(id).childNodes[1].src='images/Plants/Cactus/Elongation.gif'; //伸长
			oSym.addTask(90,function(id){
				var P=$P[id],t;
				if(P){
					P.NormalGif=3; //普通gif变为高个子
					$(id).childNodes[1].src='images/Plants/Cactus/Cactus2.gif'; //变换成高个子仙人掌
					t=P.CheckLoop;
					P.CheckLoop=P.CheckLoop2;
					P.CheckLoop2=t;
					t=P.NormalAttack;
					P.NormalAttack=P.NormalAttack2;
					P.NormalAttack2=t;
					P.ES=P.Shorten;
					P.canTrigger=1;
				}
			},[id]);
			return false;
		}
	},
	Shorten:function(){ //当有气球时的AttackCheck2
		var P=this,id=P.id;
		if(oGd.$Balloon[P.R]>0){ //有气球
			return true;
		}else{ //没有气球，缩短
			P.canTrigger=0; //伸缩过程不受触发
			P.Status=0;
			$(id).childNodes[1].src='images/Plants/Cactus/Shorten.gif'; //缩短
			oSym.addTask(90,function(id){
				var P=$P[id],t;
				if(P){
					P.NormalGif=2; //变为普通gif
					$(id).childNodes[1].src='images/Plants/Cactus/Cactus.gif'; //变换成普通仙人掌
					t=P.CheckLoop;
					P.CheckLoop=P.CheckLoop2;
					P.CheckLoop2=t;
					t=P.NormalAttack;
					P.NormalAttack=P.NormalAttack2;
					P.NormalAttack2=t;
					P.ES=P.Elongation;
					P.canTrigger=1;
				}
			},[id]);
			return false;
		}
	},
	NormalAttack:function(){
		var o=this,id='CB'+Math.random(),oid=o.id;
		$(oid).childNodes[1].src='images/Plants/Cactus/Attack.gif';
		oSym.addTask(40,function(id){var o=$(id);o&&(o.childNodes[1].src='images/Plants/Cactus/Cactus.gif');},[oid]);
		NewImg(id,o.PicArr[8],'left:'+(o.AttackedRX+25)+'px;top:'+(o.pixelTop+103)+'px;visibility:hidden;z-index:'+(o.zIndex+2),EDPZ);
		oSym.addTask(20,function(id){var o=$(id);o&&SetVisible(o)},[id]);
		oSym.addTask(1,function(id,img,D,OX,R,pixelLeft){ //移动仙人掌子弹
			var side,C=GetC(OX),Z=oZ['getZ'+D](OX,R);
			Z&&Z.Altitude==1?(Z.getPea(Z,20,D),ClearChild(img)):(
				OX+=(side=!D?5:-5))<oS.W&&OX>100?(
				img.style.left=(pixelLeft+=side)+'px',
				oSym.addTask(1,arguments.callee,[id,img,D,OX,R,pixelLeft])):ClearChild(img);
		},[id,$(id),0,o.AttackedLX,o.R,o.AttackedLX-40]);
	},
	NormalAttack2:function(){ //攻击飞行气球的子弹
		var o=this,id='CB'+Math.random(),oid=o.id;
		$(oid).childNodes[1].src='images/Plants/Cactus/Attack2.gif';
		oSym.addTask(50,function(id){var o=$(id);o&&(o.childNodes[1].src='images/Plants/Cactus/Cactus2.gif');},[oid]);
		NewImg(id,o.PicArr[8],'left:'+(o.AttackedRX+125)+'px;top:'+(o.pixelTop+33)+'px;visibility:hidden;z-index:'+(o.zIndex+2),EDPZ);
		oSym.addTask(20,function(id){var o=$(id);o&&SetVisible(o)},[id]);
		oSym.addTask(1,function(id,img,D,OX,R,pixelLeft){ //移动仙人掌子弹
			var side,C=GetC(OX),Z=oZ['getZ'+D](OX,R);
			Z&&Z.Altitude==3?(
				Z.getHit0(Z,20,D),
				Z.Drop(), //飞行中的僵尸跌落
				ClearChild(img)
			):(
				OX+=(side=!D?5:-5))<oS.W&&OX>100?(
				img.style.left=(pixelLeft+=side)+'px',
				oSym.addTask(1,arguments.callee,[id,img,D,OX,R,pixelLeft])):ClearChild(img);
		},[id,$(id),0,o.AttackedLX,o.R,o.AttackedLX-40]);
	}
}),

//三叶草
oBlover=InheritO(CPlants,{
	EName:'oBlover',CName:'三叶草',width:118,height:92,SunNum:100,beAttackedPointL:30,beAttackedPointR:105,
	PicArr:['images/Card/Plants/Blover.png','images/Plants/Blover/0.gif','images/Plants/Blover/Blover.gif','images/Plants/Blover/2.gif'],
	Tooltip:'能吹走所有气球和迷雾',Produce:'三叶草，能吹走所有的气球僵尸，也可以把雾吹散。<p>使用方法：<font color="#FF0000">单独使用，立即生效</font><br>特点：<font color="#FF0000">吹走屏幕上所有的气球僵尸</font></p>当三叶草五岁生日的时候，他得到了一个闪亮的生日蛋糕。他许好愿，然后深吸一口气却只吹灭了60%的蜡烛。然而他没有放弃，小时候的那次失败促使他更加努力直到现在。',
	InitTrigger:function(){},Status:0, //标记还未吹风
	AudioArr:['blover'],
	PrivateBirth:function(o){
		//种植后0.5秒开始吹风
		oSym.addTask(50,function(pid){
			var p=$P[pid];
			PlayAudio('blover');
			p&&p.Status==0&&p.Dispel(p);
		},[o.id]);
	},
	//吹风
	Dispel:function(p){
		var id=p.id,zid,oBalloon=oGd.$oBalloon;
		p.Status=1; //标记已经吹风了
		$(id).childNodes[1].src='images/Plants/Blover/2.gif';
		oGd.MoveFogRight(); //驱散雾
		for(zid in oBalloon)oBalloon[zid].getDispelled(); //把气球吹跑
		oSym.addTask(150,function(id){
			var p=$P[id];
			p&&p.Die();
			oSym.addTask(2400,function(){oGd.MoveFogLeft()},[]); //24s后恢复
		},[id]);
	},
	getHurt:function(o){this.Dispel(this)} //被攻击立即吹风
});


/*
//海蘑菇
var CSeaShroom=function(){
	CreateCardGif('oSeaShroom','images/Card/Plants/SeaShroom.png','海蘑菇');
	CreatePlantGif('oSeaShroom','images/Plants/SeaShroom/SeaShroom.gif');
	CreatePlantGif('SeaShroomSleep','images/Plants/SeaShroom/SeaShroomSleep.gif');
	if(dicPlantsGif['ShroomBullet']==undefined){
		CreatePlantGif('ShroomBullet','images/Plants/ShroomBullet.gif');
	}
}
CSeaShroom.prototype=new CPlants();
SetPrototype(CSeaShroom,{EName:'oSeaShroom',
				CName:'海蘑菇',
				cardImage:'images/Card/Plants/SeaShroom.png',
				normalGif:'images/Plants/SeaShroom/SeaShroom.gif',
				width:48,
				height:99,
				SunNum:0,
				canGrow:'[水池]',
				coolTime:30000,
				Stature:0,
				beAttackedPointL:20,
				beAttackedPointR:28,
				Tooltip:'发射短距离孢子的水生植物',
				Produce:'海蘑菇，能够发射短程孢子的水生植物。<p>伤害：<font color="#FF0000">普通</font><br>射程：<font color="#FF0000">短<br>必须种在水上<br>白天睡觉</font></p>海蘑菇从来没看到过大海，大海就在他的名字里，他总听到关于大海的事。他只是没找到合适的时间，总有一天……是的，他会见到海的。'})

//返回在某种属性场地上纵坐标的偏移量
CSeaShroom.prototype.GetDeviationY=function(C,R){
	switch(oGP.aPAfterGrow[C][R]){
		case '[水池]':
			return(-15);
			break;
		default:
			return(-15);
	}
}
CSeaShroom.prototype.Birth=function(id){
	var dicOb=dicPlant[id],C=dicOb.C,R=dicOb.R;
	if(oGP.GroundTime=='白天'){ //白天睡觉的蘑菇
		$(id).src=dicPlantsGif['SeaShroomSleep'].src;
		dicOb.Sleep=1;
	}else{
		$(id).src=dicPlantsGif['oSeaShroom'].src;
		dicOb.Sleep=0;
		dicOb.fAttack(dicOb,C,R,(C+2>oGP.MaxC)?oGP.MaxC+1:C+3,'SSB_'+C+'_'+R+'_',3*R+2,dicOb.AttackedLX,dicOb.AttackedLX-46,dicOb.pixelTop+55);
	}
	oGP.aPlant[C][R][0]=id;
}
CSeaShroom.prototype.WakeUp=function(id){
	//被唤醒
	var dicOb=dicPlant[id],C=dicOb.C,R=dicOb.R;
	$(id).src=dicPlantsGif['oSeaShroom'].src;
	dicOb.Sleep=0;
	dicOb.fAttack(dicOb,C,R,(C+2>oGP.MaxC)?oGP.MaxC+1:C+3,'SSB_'+C+'_'+R+'_',3*R+2,dicOb.AttackedLX,dicOb.AttackedLX-46,dicOb.pixelTop+55);
}
CSeaShroom.prototype.fAttack=function(dicOb,C,R,CMax,IDStr,zIndex,AttackedLX,pixelLeft,pixelTop){
	var id=dicOb.id;
	if(!dicOb.HaveEnemy(C,CMax,R)){ //判断没有敌人
		setTimeout(function(){var ob=dicPlant[id];if(ob!=undefined){ob.fAttack(ob,C,R,CMax,IDStr,zIndex,AttackedLX,pixelLeft,pixelTop)}},1400);
		return(false);
	}
	var ob=$(id),SeaShroomBullet=$n('img'),d=new Date(),s=d.getMinutes()+'_'+d.getSeconds()+'_'+d.getMilliseconds(),PID=IDStr+s,obPea;
	obPea={id:PID,
			X:AttackedLX,
			C:C,
			R:R}
	SeaShroomBullet.id=PID;
	obPea.pixelLeft=pixelLeft;
	obPea.pixelTop=pixelTop;
	SeaShroomBullet.style.left=obPea.pixelLeft+'px';
	SeaShroomBullet.style.top=obPea.pixelTop+'px';
	SeaShroomBullet.setAttribute('src',dicPlantsGif['ShroomBullet'].src);
	SeaShroomBullet.style.position='absolute';
	SeaShroomBullet.style.zIndex=zIndex;
	SeaShroomBullet.style.display='none';
	aMoveShroomBullet.push(obPea);
	EDPZ.appendChild(SeaShroomBullet);
	setTimeout(function(){var tmpOb=$(PID);if(tmpOb!=null){tmpOb.style.display='block'}},100);
	setTimeout(function(){var ob=dicPlant[id];if(ob!=undefined){ob.fAttack(ob,C,R,CMax,IDStr,zIndex,AttackedLX,pixelLeft,pixelTop)}},1400);
}
CSeaShroom.prototype.HaveEnemy=function(C,CMax,R){
	if(oGP.aR[R]==0){return(false);}
	var atmp,m,ar,MaxWidth=oGP.MaxWidth,ZX;
	for(m=CMax;m>=C;m--){
		atmp=oGP.aZombie[m][R];
		for(zid in atmp){
			ar=atmp[zid];
			ZX=(ar[3]==0)?ar[1]:ar[2];
			if(ZX>=AttackedLX&&ZX<MaxWidth){ //僵尸的被攻击点横坐标必须大于植物被攻击点横坐标
				return(true);
			}
		}
	}
	return(false);
}

//杨桃

//返回在某种属性场地上纵坐标的偏移量
CStarfruit.prototype.GetDeviationY=function(C,R){
	switch(oGP.aPAfterGrow[C][R]){
		case '[草地]':
			return(-10);
			break;
		case '[花盆]':
			return(-18);
			break;
		case '[睡莲]':
			return(-15);
			break;
		default:
			return(0);
	}
}
CStarfruit.prototype.Birth=function(id){
	var ob=$(id),dicOb=dicPlant[id],C=dicOb.C,R=dicOb.R,MX=dicOb.pixelLeft+dicOb.width*0.5,pixelLeft=MX-15,pixelTop=dicOb.pixelTop+15;
	ob.src=dicOb.src=dicPlantsGif['oStarfruit'].src;
	oGP.aPlant[C][R][0]=id;
	
	var aYRD=[],aYRU=[],aYD=[],aYU=[],Sqrt3=Math.sqrt(3),tmpRD=pixelLeft-pixelTop*Sqrt3,tmpRU=pixelLeft+pixelTop*Sqrt3,pixelTop4=pixelTop*4,pixelTop2=pixelTop*2;
	//右下,下
	for(m=R+1;m<=oGP.MaxR;m++){
		aY=GetY1Y2(m);
		Y1=aY[0];Y2=aY[1];
		//FlyTime1=(Y1-pixelTop)*4; 完整的飞行到Y1所需要的时间1计算公式
		//FlyTime2=(Y2-pixelTop)*4; 完整的飞行时间2
		//X1=pixelLeft+(Y1-pixelTop)*Math.sqrt(3); 完整的X1公式
		//X2=pixelLeft+(Y2-pixelTop)*Math.sqrt(3); 完整的X2公式
		FlyTime1=4*Y1-pixelTop4;
		FlyTime2=4*Y2-pixelTop4;
		X1=Sqrt3*Y1+tmpRD;
		X2=Sqrt3*Y2+tmpRD;
		aYRD.push([X1,X2,FlyTime1,FlyTime2]);
		aYD.push([FlyTime1*0.5,FlyTime2*0.5]);
	}
	//右上,上
	for(m=R-1;m>=1;m--){
		aY=GetY1Y2(m);
		Y1=aY[0];Y2=aY[1];
		//FlyTime1=(pixelTop-Y2)*4;
		//FlyTime2=(pixelTop-Y1)*4;
		//X1=pixelLeft+(pixelTop-Y2)*Math.sqrt(3);
		//X2=pixelLeft+(pixelTop-Y1)*Math.sqrt(3);
		FlyTime1=pixelTop4-4*Y2;
		FlyTime2=pixelTop4-4*Y1;
		X1=tmpRU-Sqrt3*Y2;
		X2=tmpRU-Sqrt3*Y1;
		aYRU.push([X1,X2,FlyTime1,FlyTime2]);
		aYU.push([FlyTime1*0.5,FlyTime2*0.5]);
	}
	dicOb.fAttack(dicOb,C,R,3*R+2,'Star_'+C+'_'+R+'_',oGP.MaxC,oGP.MaxR,MX,pixelLeft,pixelTop,aYRD,aYRU,aYD,aYU);
}
//右上和右下的纵向飞行速度是1/4像素/毫秒，横向飞行速度是Math.sqrt(3)/4像素/毫秒.30度夹角飞行
CStarfruit.prototype.fAttack=function(dicOb,C,R,zIndex,IDStr,MaxC,MaxR,MX,pixelLeft,pixelTop,aYRD,aYRU,aYD,aYU){
	var id=dicOb.id;
	if(dicOb.HaveEnemy(dicOb,C,R,MaxC,MaxR,MX,aYRD,aYRU,aYD,aYU)){dicOb.AttackAll(C,R,zIndex,IDStr,MX,pixelLeft,pixelTop);}
	setTimeout(function(){var ob=dicPlant[id];if(ob!=undefined){ob.fAttack(ob,C,R,zIndex,IDStr,MaxC,MaxR,MX,pixelLeft,pixelTop,aYRD,aYRU,aYD,aYU)}},1400);
}
CStarfruit.prototype.HaveEnemy=function(dicOb,C,R,MaxC,MaxR,MX,aYRD,aYRU,aYD,aYU){
	if(dicOb.HaveEnemyRU(dicOb,C,R,MaxC,MX,aYRU,aYU)){return(true);}
	if(dicOb.HaveEnemyRD(dicOb,C,R,MaxC,MaxR,MX,aYRD,aYD)){return(true);}
	if(dicOb.HaveEnemyL(dicOb,C,R,MX)){return(true);}
}
CStarfruit.prototype.AttackAll=function(C,R,zIndex,IDStr,MX,pixelLeft,pixelTop){
	var aImg=new Array(5),aDirect=[1,2,4,6,7],d=new Date(),s=d.getMinutes()+'_'+d.getSeconds()+'_'+d.getMilliseconds(),PID,obPea=[];
	IDStr+=s+'_';
	for(n=0;n<=4;n++){
		PID=IDStr+n;
		obPea[n]={id:PID,X:MX,C:C,R:R,AttackDirection:aDirect[n],pixelLeft:pixelLeft,pixelTop:pixelTop}
		aImg[n]=$n('img');
		var B=aImg[n];
		B.id=PID;
		B.style.left=obPea[n].pixelLeft+'px';
		B.style.top=obPea[n].pixelTop+'px';
		B.setAttribute('src',dicPlantsGif['Star'].src);
		B.style.position='absolute';
		B.style.zIndex=zIndex;
		aMoveStar.push(obPea[n]);
		EDPZ.appendChild(B);
	}
}

CStarfruit.prototype.HaveEnemyRD=function(dicOb,C,R,MaxC,MaxR,MX,aYRD,aYD){
	//aYRD=[X1,X2,FlyTime1,FlyTime2];
	var i=-1,ar,ZombieSpeed,tmpC=C-1-2*R,tmpMaxC=MaxC+2,tmpCMin,CMinD=(C>1)?C-2:0,CMaxD=C+2;
	for(m=R+1;m<=MaxR;m++){
		i++;
		if(oGP.aR[m]==0){continue;}
		//右下方向
		ar=aYRD[i];X1=ar[0];X2=ar[1];FlyTime1=ar[2];FlyTime2=ar[3];
		//CMin=C-1+2*(m-R); 完整的CMin计算公式，用tmpC取代不会改变的C-1-2*R
		CMin=tmpC+2*m;
		if(CMin>tmpMaxC){break;}
		tmpCMin=CMin+4;
		CMax=(tmpCMin<=tmpMaxC)?tmpCMin:tmpMaxC;
		for(n=CMin;n<=CMax;n++){
			atmp=oGP.aZombie[n][m];
			for(zid in atmp){
				arr=atmp[zid];
				ZombieSpeed=dicZombie[zid].Speed*0.01; //FlyTime1是子弹飞到该格的最短时间，FlyTime2是飞的最长时间
				S1=ZombieSpeed*FlyTime1;S2=ZombieSpeed*FlyTime2; //FlyTime1和FlyTime2时间，僵尸分别走的距离即最短距离和最长距离
				switch(arr[3]){
					case 0: //往左走的僵尸
						if(arr[2]<X1){continue;} //如果已经在X1左边了，跳过
						ZX1=arr[2]-S1;ZX2=arr[1]-S2; //ZX1代表走的最快的所能走到的坐标，ZX2代表走的最慢的所能走到的坐标
						if(ZX1>=X1&&ZX2<=X2){return(true);} //最快坐标和最慢坐标必须在子弹的X范围内
						break;
					default: //往右走的僵尸
						if(arr[1]>X2){continue;} //如果已经在X2右边了，跳过
						ZX1=arr[1]+S1;ZX2=arr[2]+S2;
						if(ZX1<=X2&&ZX2>=X1){return(true);}
				}
			}
		}
		//下方
		ar=aYD[i];FlyTime1=ar[0];FlyTime2=ar[1];
		for(n=CMinD;n<=CMaxD;n++){
			atmp=oGP.aZombie[n][m];
			for(zid in atmp){
				arr=atmp[zid];
				ZombieSpeed=dicZombie[zid].Speed*0.01;
				S1=ZombieSpeed*FlyTime1;S2=ZombieSpeed*FlyTime2;
				switch(arr[3]){
					case 0: //往左走的僵尸
						if(arr[2]<MX){continue;} //如果已经在MX左边了，跳过
						ZX1=arr[2]-S1;ZX2=arr[1]-S2;
						if(ZX1>=MX&&ZX2<=MX){return(true);}
						break;
					default:
						if(arr[1]>MX){continue;} //如果已经在MX右边了，跳过
						ZX1=arr[1]+S1;ZX2=arr[2]+S2;
						if(ZX1<=MX&&ZX2>=MX){return(true);}
				}
			}
		}
	}
	return(false);
}

CStarfruit.prototype.HaveEnemyRU=function(dicOb,C,R,MaxC,MX,aYRU,aYU){
	//判断右上边是否有僵尸
	var i=-1,ar,ZombieSpeed,tmpC=C-1+2*R,tmpMaxC=MaxC+2,tmpCMin,CMinU=(C>1)?C-2:0,CMaxU=C+2;
	for(m=R-1;m>=1;m--){ //循环读取每行监控的列
		i++;
		if(oGP.aR[m]==0){continue;}
		//右上
		ar=aYRU[i];X1=ar[0];X2=ar[1];FlyTime1=ar[2];FlyTime2=ar[3];
		//CMin=C-1+2*(R-m);
		CMin=tmpC-2*m;
		if(CMin>tmpMaxC){break;}
		tmpCMin=CMin+4;
		CMax=(tmpCMin<=tmpMaxC)?tmpCMin:tmpMaxC;
		for(n=CMin;n<=CMax;n++){
			atmp=oGP.aZombie[n][m];
			for(zid in atmp){
				arr=atmp[zid];
				ZombieSpeed=dicZombie[zid].Speed*0.01; //FlyTime1是子弹飞到该格的最短时间，FlyTime2是飞的最长时间
				S1=ZombieSpeed*FlyTime1;S2=ZombieSpeed*FlyTime2; //FlyTime1和FlyTime2时间，僵尸分别走的距离即最短距离和最长距离
				switch(arr[3]){
					case 0: //往左走的僵尸
						if(arr[2]<X1){continue;} //如果已经在X1左边了，跳过
						ZX1=arr[2]-S1;ZX2=arr[1]-S2; //ZX1代表走的最快的所能走到的坐标，ZX2代表走的最慢的所能走到的坐标
						if(ZX1>=X1&&ZX2<=X2){return(true);} //最快坐标和最慢坐标必须在子弹的X范围内
						break;
					default: //往右走的僵尸
						if(arr[1]>X2){continue;} //如果已经在X2右边了，跳过
						ZX1=arr[1]+S1;ZX2=arr[2]+S2;
						if(ZX1<=X2&&ZX2>=X1){return(true);}
				}
			}
		}
		//上
		ar=aYU[i];FlyTime1=ar[0];FlyTime2=ar[1];
		for(n=CMinU;n<=CMaxU;n++){
			atmp=oGP.aZombie[n][m];
			for(zid in atmp){
				arr=atmp[zid];
				ZombieSpeed=dicZombie[zid].Speed*0.01;
				S1=ZombieSpeed*FlyTime1;S2=ZombieSpeed*FlyTime2;
				switch(arr[3]){
					case 0: //往左走的僵尸
						if(arr[2]<MX){continue;} //如果已经在MX左边了，跳过
						ZX1=arr[2]-S1;ZX2=arr[1]-S2;
						if(ZX1>=MX&&ZX2<=MX){return(true);}
						break;
					default:
						if(arr[1]>MX){continue;} //如果已经在MX右边了，跳过
						ZX1=arr[1]+S1;ZX2=arr[2]+S2;
						if(ZX1<=MX&&ZX2>=MX){return(true);}
				}
			}
		}
	}
	return(false);
}
CStarfruit.prototype.HaveEnemyL=function(dicOb,C,R,MX){
	//判断左边是否有僵尸
	if(oGP.aR[R]==0){return(false);}
	var m,atmp;
	for(m=0;m<=C;m++){
		atmp=oGP.aZombie[m][R];
		for(id in atmp){
			if((atmp[id][3]==0)?atmp[id][1]:atmp[id][2]>=MX){
				return(true);
			}
		}
	}
	return(false);
}

//移动杨桃子弹
function MoveStarBullet(){
	if(aMoveStar.length==0){
		return(false);
	}
	var ZombieLX,ZombieRX,arr=[],ar,m=0,n,ob,obA,atmp,tmpOb,obZombie,MaxWidth=oGP.MaxWidth,MaxHeight=oGP.MaxHeight-15,MaxC=oGP.MaxC,obC,obR;
	while(true){
		if(m>aMoveStar.length-1){break;}
		obA=aMoveStar[m]; //获取子弹数组的元素对象
		ob=$(obA.id); //子弹的img
		tmpOb='';obC=obA.C;obR=obA.R;arr=[];
		//子弹的格子C//子弹的格子R//子弹的中点X坐标
		switch(obA.AttackDirection){
			case 1: //向右下
				atmp=JoinArr(oGP.aZombie[obC-1][obR],oGP.aZombie[obC][obR],oGP.aZombie[obC+1][obR]);
				for(n=atmp.length-1;n>=0;n--){
					ar=atmp[n];
					ZombieLX=ar[1];ZombieRX=ar[2];
					if(obA.X>=ZombieLX&&obA.X<=ZombieRX){arr.push([ar[0],ZombieLX]);}
				}
				if(arr.length>0){
					arr.sort(function(a,b){return(a[1]-b[1])});
					tmpOb=dicZombie[arr[0][0]];
					if(tmpOb.Location=='地上'){
						if(tmpOb.beAttacked==1){
							PlantAttack(obA.id,tmpOb.id,0,20,0,0,0,'直线');
						}
						EDPZ.removeChild(ob);
						aMoveStar.splice(m,1);
						continue;
					}
				}
				obA.X+=8.6;
				if(obA.X>MaxWidth){EDPZ.removeChild(ob);aMoveStar.splice(m,1);continue;}
				obA.pixelTop+=5;
				if(obA.pixelTop>MaxHeight){EDPZ.removeChild(ob);aMoveStar.splice(m,1);continue;}
				obA.C=GetC(obA.X);
				obA.R=GetR(obA.pixelTop+15);
				obA.pixelLeft+=8.6;
				ob.style.left=obA.pixelLeft+'px';
				ob.style.top=obA.pixelTop+'px';
				break;			
			case 7: //向右上
				atmp=JoinArr(oGP.aZombie[obC-1][obR],oGP.aZombie[obC][obR],oGP.aZombie[obC+1][obR]);
				for(n=atmp.length-1;n>=0;n--){
					ar=atmp[n];
					ZombieLX=ar[1];ZombieRX=ar[2];
					if(obA.X>=ZombieLX&&obA.X<=ZombieRX){arr.push([ar[0],ZombieLX]);}
				}
				if(arr.length>0){
					arr.sort(function(a,b){return(a[1]-b[1])});
					tmpOb=dicZombie[arr[0][0]];
					if(tmpOb.Location=='地上'){
						if(tmpOb.beAttacked==1){
							PlantAttack(obA.id,tmpOb.id,0,20,0,0,0,'直线');
						}
						EDPZ.removeChild(ob);
						aMoveStar.splice(m,1);
						continue;
					}
				}
				obA.X+=8.6;
				if(obA.X>MaxWidth){EDPZ.removeChild(ob);aMoveStar.splice(m,1);continue;}
				obA.pixelTop-=5;
				if(obA.pixelTop<-15){EDPZ.removeChild(ob);aMoveStar.splice(m,1);continue;}
				obA.C=GetC(obA.X);
				obA.R=GetR(obA.pixelTop+15);
				obA.pixelLeft+=8.6;
				ob.style.left=obA.pixelLeft+'px';
				ob.style.top=obA.pixelTop+'px';
				break;
			case 2: //向下
				atmp=JoinArr(oGP.aZombie[obC-1][obR],oGP.aZombie[obC][obR],oGP.aZombie[obC+1][obR]);
				for(n=atmp.length-1;n>=0;n--){
					ar=atmp[n];
					ZombieLX=ar[1];ZombieRX=ar[2];
					if(obA.X>=ZombieLX&&obA.X<=ZombieRX){arr.push([ar[0],ZombieLX]);}
				}
				if(arr.length>0){
					arr.sort(function(a,b){return(a[1]-b[1])});
					tmpOb=dicZombie[arr[0][0]];
					if(tmpOb.Location=='地上'){
						if(tmpOb.beAttacked==1){
							PlantAttack(obA.id,tmpOb.id,0,20,0,0,0,'直线');
						}
						EDPZ.removeChild(ob);
						aMoveStar.splice(m,1);
						continue;
					}
				}
				obA.pixelTop+=10;
				if(obA.pixelTop>MaxHeight){EDPZ.removeChild(ob);aMoveStar.splice(m,1);continue;}
				obA.R=GetR(obA.pixelTop+15);
				ob.style.top=obA.pixelTop+'px';

				break;
			case 6: //向上
				atmp=JoinArr(oGP.aZombie[obC-1][obR],oGP.aZombie[obC][obR],oGP.aZombie[obC+1][obR]);
				for(n=atmp.length-1;n>=0;n--){
					ar=atmp[n];
					ZombieLX=ar[1];ZombieRX=ar[2];
					if(obA.X>=ZombieLX&&obA.X<=ZombieRX){arr.push([ar[0],ZombieLX]);}
				}
				if(arr.length>0){
					arr.sort(function(a,b){return(a[1]-b[1])});
					tmpOb=dicZombie[arr[0][0]];
					if(tmpOb.Location=='地上'){
						if(tmpOb.beAttacked==1){
							PlantAttack(obA.id,tmpOb.id,0,20,0,0,0,'直线');
						}
						EDPZ.removeChild(ob);
						aMoveStar.splice(m,1);
						continue;
					}
				}
				obA.pixelTop-=10;
				if(obA.pixelTop<-15){EDPZ.removeChild(ob);aMoveStar.splice(m,1);continue;}
				obA.R=GetR(obA.pixelTop+15);
				ob.style.top=obA.pixelTop+'px';
				break;
			case 4: //向左
				atmp=(obC>0)?JoinArr(oGP.aZombie[obC-1][obR],oGP.aZombie[obC][obR],oGP.aZombie[obC+1][obR]):JoinArr(oGP.aZombie[obC][obR],oGP.aZombie[obC+1][obR]);
				for(n=atmp.length-1;n>=0;n--){
					ar=atmp[n];
					ZombieLX=ar[1];ZombieRX=ar[2];
					if(obA.X>=ZombieLX&&obA.X<=ZombieRX){arr.push([ar[0],ZombieRX]);}
				}
				if(arr.length>0){
					arr.sort(function(a,b){return(b[1]-a[1])});
					tmpOb=dicZombie[arr[0][0]];
					if(tmpOb.Location=='地上'){
						if(tmpOb.beAttacked==1){
							PlantAttack(obA.id,tmpOb.id,0,20,0,0,0,'直线');
						}
						EDPZ.removeChild(ob);
						aMoveStar.splice(m,1);
						continue;
					}
				}
				obA.X-=10;
				if(obA.X<0){EDPZ.removeChild(ob);aMoveStar.splice(m,1);continue;}
				obA.C=GetC(obA.X);
				obA.pixelLeft-=10;
				ob.style.left=obA.pixelLeft+'px';
				break;
		}
		m+=1;
	}
}
function PeaBulletHitZombie(tmpOb,obA,SpC1,SpC2,SpX1,SpX2,aZombie,zRC){
	//子弹成功击中
	if(tmpOb.Location!='地上')return(false);
	var n,atmp,zid,Sob,ar,ZX;
	if(tmpOb.beAttacked){ //僵尸不是临死状态,可以被攻击;是临死状态则吸收攻击，僵尸生命匀速减少，由僵尸自身function执行
		if(obA.BulletKind==1&&!tmpOb.againstSputtering){ //僵尸能引起火豌豆溅射，并且豌豆是火豌豆
			//选择50px内的僵尸判断能否被溅射
			for(n=SpC1;n<=SpC2;n++){ //往左攻击的豌豆选择左边两个格子，右的选择右边
				if(!zRC[n])continue; //本格僵尸数量0
				atmp=aZombie[n];
				for(zid in atmp){
					Sob=dicZombie[zid];ar=atmp[zid];ZX=(!ar[3])?ar[1]:ar[2];
					if(ZX>=SpX1&&ZX<=SpX2&&!Sob.againstSputtering&&Sob.beAttacked){
							PlantAttack(obA.id,tmpOb.id,0,13,0,0,0,'溅射');
					}
				}
			}
		}
		PlantAttack(obA.id,tmpOb.id,0,obA.Attack,0,0,obA.BulletKind,'直线');
	}
	return(true);
}
*/