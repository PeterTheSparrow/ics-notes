---
title: 第六节 Pipe实现
sidebar_position: 7
---

## 第六节 Pipe实现

#### 一、Fetch阶段

- 基本和顺序的差不多，HCL如下

```
# 用来预测的
int F_predPC = [
	f_icode in {IJXX, ICALL} : f_valC;
	1: f_valP;
];
#  代表的是Fetch阶段选择的PC 
int f_PC = [
		# 前面两个都是用来亡羊补牢的，读错了指令补救用的
	  M_icode == IJXX && !M_Cnd : M_valA;
	  W_icode == IRET : W_valM;
	  # 正常的默认读取，说白了就是猜一个指令执行
	  1: F_predPC
];
# 需要及时的更新fetch阶段执行的状态，如果出现异常就要处理
int f_stat = [
	imem_error: 	 	SADR;
	!instr_valid: 	SINS;
	f_icode == IHALT: 	SHLT;
	1: 			SAOK;
];

```

![截屏2023-03-26 13.20.23](./6-Pipe%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-26%2013.20.23.png)

#### 二、Decode阶段

- 具体的参考第五节笔记（如果读取的寄存器和之前要写的寄存器一样，这时候就要Forwarding！）
- 本来是六种情况，我们只能处理五种情况，每个情况对应的是两个信号，所以一共是10个信号

![截屏2023-03-26 13.25.31](./6-Pipe%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-26%2013.25.31.png)

```
## What should be the A value?
int d_valA = [
  # Use incremented PC 如果是ICALL或者IJXX的时候，需要用到ValP
	D_icode in { ICALL, IJXX } : D_valP; 
	
	# 下面的顺序非常重要，原因参考第五节
  # Forward valE from execute 
	d_srcA == E_dstE : e_valE;
  # Forward valM from memory
	d_srcA == M_dstM : m_valM; 
  # Forward valE from memory 
	d_srcA == M_dstE : M_valE;    
  # Forward valM from write back 
	d_srcA == W_dstM : W_valM;    
  # Forward valE from write back
	d_srcA == W_dstE : W_valE;
  # Use value read from register file
 	1 : d_rvalA;
];

# d_valB 对应图片里面的FwdB出来的那个值
d_valB = {
	// 必须首先考虑选择Execute阶段出来的结果，因为这个是最新的一条指令
	// 如果选择更早的比如WriteBack阶段的指令，相当于选择了个更早的指令产生的结果，
	
	d_srcB == E_dstE: e_valE 
	# 如果我这个指令要读取的寄存器和Execute执行阶段要写入的寄存器一样
	# 那么我就可以直接把Execute的要写入该寄存器的值拿出来就好
	
	// d_srcB 如果同时和M_dstM、M_dstE相等怎么办？
	// 为什么会发生这种情况？前一个指令既要把内存读的值写到寄存器，
	// 又要把Execute计算的结果写回到寄存器？正好就是pop %rsp的例子
	// (Execute计算 旧的rsp+8，又要把栈顶的元素写入到rsp)
	// 根据x86设计，优先选择读取内存的结果写入到寄存器
	// 也就是说要写入的值，需要优先以内存读出来的为主，所以下面的顺序不能反
	// 优先选择内存的读出来的值
	d_srcB == M_dstM: m_valM 
	# 为什么是m_vamM，因为Memory阶段读取内存的值将会被写入到寄存器
	# 所以下图中“数据内存”的数据出口m-valM才是即将要写入到寄存器的值
	
	d_srcB == M_dstE: M_valE 
	# 如果我这个指令要读的寄存器和Memory阶段要写入的寄存器一样
	# 那么我就可以把m_valM(从内存里面拿到的数据，即将写入到dstM的寄存器)
	# 直接拿出来用就好
                          
  // 同样的道理，如果W_dstM==W_dstE
  // 典型的例子：pop %rsp，这时候优先选择内存的valM
  d_srcB == W_dstM: W_valM 
	# 如果是write阶段的W_dstM，直接拿W_valM

	d_srcB == W_dstE: W_valE 
	# 如果是write阶段的W_dstE，直接拿W_valE

	1: 如果都不是，那就老老实实的选择从寄存器里面读取出来的值
}
```

#### 三、WriteBack阶段

- Stat表示：最终WriteBack阶段执行后的指令的状态，如果是因为前面的指令插入了Bubble的空指令，那就还是代表状态是OK的，否则就根据前面的指令的状态来。

```
int Stat = [
	# SBUB in earlier stages indicates bubble
	W_stat == SBUB : SAOK;
	1 : W_stat;
];
```

![截屏2023-03-26 15.57.51](./6-Pipe%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-26%2015.57.51.png)

#### 四、Execute阶段

-  当指令出现异常的时候，需要确保**异常指令前面的全部执行，后面的不能执行！**
- 所以这里在设置CC的时候，需要保证Memory阶段的状态、WriteBack的状态都不是非法指令
- 这样就保护了程序员可见状态不会被破坏

```
# Should the condition codes be updated?
bool set_cc = (E_icode == IOPL)
	# State changes only during normal operation
	      && !m_stat in { SADR, SINS, SHLT } 
	      && !W_stat in { SADR, SINS, SHLT };
```

![截屏2023-03-26 16.01.36](./6-Pipe%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-26%2016.01.36.png)

#### 五、Memory阶段

- 如果发现地址错误就要把m_stat变成错误的信息
- 否则就继承上一个步骤的状态

```
int m_stat = [
	dmem_error : SADR;
	1 : M_stat;
];
```

![截屏2023-03-26 16.03.02](./6-Pipe%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-26%2016.03.02.png)

> 到此为止我们插入完成了嘛？还有Bubble的处理

#### 六、插入Bubble

##### a）检测Load/Use冒险

- 什么条件插入Bubble？
- 当Execute阶段执行的是从内存到寄存器的Mov的时候，并且目标寄存器是后面Decode阶段的要读取的寄存器的时候，才会需要插入Bubble？
- 为什么？MRMove是把内存的值移动到寄存器rA(假设)，需要到读取内存那一个步骤，才能获取到要写入到目标寄存器rA的值，如果后面一个指令紧接着要读rA，这时候就必须要等到前面一个指令执行完成之后，才能开始读取，需要硬件处理的时候主动插入Bubble。

| Condition        | Trigger                                                      |
| ---------------- | ------------------------------------------------------------ |
| Load/Use  Hazard | E_icode  in { IMRMOVQ, IPOPQ } && E_dstM  in { d_srcA,  d_srcB  } |

- 那么，插入Bubble之后，会发生怎样的变化呢？如下所示。（Bubble后面的指令按兵不动）

| Condition        | F      | D              | E                    | M      | W      |
| ---------------- | ------ | -------------- | -------------------- | ------ | ------ |
| Load/Use  Hazard | Other1 | add %rax, %rdx | mrmovq 0(%rdx), %rax | other2 | other3 |

| Condition        | F      | D              | E      | M                    | W      |
| ---------------- | ------ | -------------- | ------ | -------------------- | ------ |
| Load/Use  Hazard | Other1 | add %rax, %rdx | bubble | mrmovq 0(%rdx), %rax | other2 |

##### b）流水线控制机制

- 引入两个变量：Stall（暂停）和Bubble（加气泡），这两个变量各自都是只有一位，表示0或者1
- Stall=0、Bubble=0的时候，就是我们原来所说的，当时钟信号上升，更新状态：

![截屏2023-03-26 16.28.23](./6-Pipe%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-26%2016.28.23.png)

- Stall=1、Bubble=0的时候，时钟信号上升，输出状态不变，相当于这个指令还停在原地按兵不动。

![截屏2023-03-26 16.28.55](./6-Pipe%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-26%2016.28.55.png)

- Stall=0、Bubble=1的时候，时钟信号上升，输出变成NOP。

![截屏2023-03-26 16.32.29](./6-Pipe%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-26%2016.32.29.png)

- 综上所述，当要插入Bubble的时候，假如第 $i$ 个指令后面一个步骤要插入Bubble，那么：
  - 第 $i$ 个指令Stall=0、Bubble=1，输出一个NOP，就在第 $i$ 个指令和第 $i+1$ 个指令之间插入一个NOP
  - 第 $i-1$ 个和之前的指令Stall=1、Bubble=0，按兵不动。
- 此外，不可能有Stall=1、Bubble=1，这是故障现象。
- 于是乎对照这个表格，设计的电路图如下：

| Condition        | Trigger                                                      |
| ---------------- | ------------------------------------------------------------ |
| Load/Use  Hazard | E_icode  in { IMRMOVQ, IPOPQ } && E_dstM  in { d_srcA,  d_srcB  } |

![截屏2023-03-26 16.40.05](./6-Pipe%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-26%2016.40.05.png)

##### b）检测Mispredicted冒险

- 判断条件
- 解读：Execute阶段的指令是跳转，并且跳转的判断结果False（之前猜的是默认跳转，因为跳转的概率大，是60%），这个时候就说明PC错了！并且已经错误的读取了两个指令在执行中。

| **Condition**        | Trigger                  |
| -------------------- | ------------------------ |
| Mispredicted  Branch | E_icode  = IJXX & !e_Cnd |

- 那么，该如何解决？答案是插入Bubble。会发生怎样的变化呢？如下所示。
- 假设之前是这样的(Other代表其他指令)：

| Condition            | F                       | D                       | E              | M     | W     |
| -------------------- | ----------------------- | ----------------------- | -------------- | ----- | ----- |
| Mispredicted  Branch | 假设跳转后，跟着的指令2 | 假设跳转后，跟着的指令1 | IJXX(发现不跳) | Other | Other |

- 现在是这样的：

| Condition            | F                       | D      | E      | M              | W     |
| -------------------- | ----------------------- | ------ | ------ | -------------- | ----- |
| Mispredicted  Branch | 正确的不跳转跟着的指令1 | Bubble | Bubble | IJXX(发现不跳) | Other |

- 所以对应的图：

| Condition            | F      | D      | E      | M      | W      |
| -------------------- | ------ | ------ | ------ | ------ | ------ |
| Mispredicted  Branch | normal | bubble | bubble | normal | normal |

##### c）检测Return冒险

- 当发现Decode或者Memory或者Execute阶段出现Ret指令的时候，无论哪个阶段出现Ret，在Decode阶段插入Bubble
- 当Ret指令执行到WriteBack的时候，此时Ret已经经过了Memory阶段，内存相关的数据已经读好了。
- 此时，Decode阶段就可以拿Ret指令执行到WriteBack的已经获得的内存值，然后读取下一个指令。

| Condition       | Trigger                                   |
| --------------- | ----------------------------------------- |
| Processing  ret | IRET  in { D_icode,  E_icode,  M_icode  } |

##### d）总结

- 各种情况下的触发条件

| Condition            | Trigger                                                      |
| -------------------- | ------------------------------------------------------------ |
| Processing  ret      | IRET  in { D_icode,  E_icode,  M_icode  }                    |
| Load/Use  Hazard     | E_icode  in { IMRMOVL, IPOPL } && E_dstM  in { d_srcA,  d_srcB  } |
| Mispredicted  Branch | E_icode  = IJXX & !e_Cnd                                     |

- 对应的处理方法

| Condition                  | F      | D      | E      | M      | W      |
| -------------------------- | ------ | ------ | ------ | ------ | ------ |
| Processing  ret in decode  | stall  | bubble | normal | normal | normal |
| Load/Use  Hazard           | stall  | stall  | bubble | normal | normal |
| Mispredicted  Branch       | normal | bubble | bubble | normal | normal |
| Processing  ret in Execute | stall  | bubble | bubble | normal | normal |
| Processing  ret in Memory  | stall  | bubble | bubble | bubble | normal |

- Stall对应的HCL

```
bool F_stall ={
	# Conditions for a load/use hazard
	// Execute阶段执行的指令是 IMRMOVL 或者 IPOPL
	// 并且Execute阶段执行的指令，要写入的寄存器E_dstM正好是在Decode阶段
	// 要执行读取操作的寄存器，这时候就是Load / Use 问题
	// 需要让Fetch阶段的指令按兵不动
	{	
		E_icode in { IMRMOVL, IPOPL } && 
		E_dstM  in { d_srcA, d_srcB } 
	}
	||
	# Stalling at fetch 
	while ret passes through pipeline
	// 此外如果出现Return问题，也需要让Fetch阶段按兵不动
	IRET in { D_icode, E_icode, M_icode };
}

// Decode阶段保持按兵不动的条件是  Load/Use  Hazard  
// 和上面的一样
bool D_stall = {
	# Conditions for a load/use hazard
	E_icode in { IMRMOVL, IPOPL } && 
	E_dstM in { d_srcA, d_srcB };
}
```

- Bubble对应的HCL

```
bool D_bubble =
	# Mispredicted branch
	# Execute阶段的False，也就是判断出指令应该不跳转 
	(E_icode == IJXX && !e_Bch) ||
	# Stalling at fetch 
	
	# 一个是Return问题
	# while ret passes through pipeline
	 IRET in { D_icode, E_icode, M_icode };

bool E_bubble =
	# Mispredicted branch
	# xecute阶段的False，也就是判断出指令应该不跳转
	(E_icode == IJXX && !e_Bch) ||
	
	# Load/use 问题
	E_icode in { IMRMOVL, IPOPL } && 
	E_dstM in { d_srcA, d_srcB};

```

#### 七、异常的出现

##### a）情况组合概览

对照下面这个表，左边的是情况，右边的五列是处理之后，下一个时钟周期的情况。

| Condition                  | F      | D      | E      | M      | W      |
| -------------------------- | ------ | ------ | ------ | ------ | ------ |
| Processing  ret in decode  | stall  | bubble | normal | normal | normal |
| Load/Use  Hazard           | stall  | stall  | bubble | normal | normal |
| Mispredicted  Branch       | normal | bubble | bubble | normal | normal |
| Processing  ret in Execute | stall  | bubble | bubble | normal | normal |
| Processing  ret in Memory  | stall  | bubble | bubble | bubble | normal |

- 假如我们把这五种情况组合起来，就会发现问题！Fetch阶段不会有事，Execute阶段也不会有事
- 但是Decode阶段如果遇到既有Stall、也有Bubble的情况怎么办？（凉了！两个都设置1就会故障）

##### b）情况组合一

- 如下图所示，例如我们在Execute阶段执行了JXX，后面Decode阶段是Ret？先思考什么情况会发生这样的？
- 我们默认的JXX的后续指令是按照跳转来处理的，也就是说ret属于是跳转之后的后续指令。请看下面的示例代码。

```
	# 假设执行到这里了,然后cc条件码全部是0，正确的做法是不跳转
	# 但是由于冒险机制，CPU猜错了猜成了跳转
	jne L1
	... # 假设这里还有指令，这些是CPU应该执行的指令。

L1:
	# 猜错之后PC设置为跳转，执行到了这里，可能就ret了
	# 如果这时候CPU真的把ret指令进入到流水线并且执行了
	# 甚至修改了程序员可见状态，那就是大问题
	# 所以理论上来说，不应该让CPU进入流水线的后面阶段
	ret
	# 此外，这里的指令到底是什么还真的不敢说，万一停机指令？
```

- 假如这个时候发现了Mispredicted  Branch，就是我预测错了，不该跳转的，那么理论来说Ret指令不应该进入流水线的

![截屏2023-03-26 18.41.02](./6-Pipe%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-26%2018.41.02.png)

- 所以实际情况如下表所示，JXX执行到了Memory阶段，此时的Ret还在Decode阶段，Fetch阶段的指令还Stall在。但是此时PC还是会使用M-val来的值作为下一个指令的地址（这种也没有大碍！不会错）

| Condition            | F      | D      | E      | M      | W      |
| -------------------- | ------ | ------ | ------ | ------ | ------ |
| Processing  ret      | stall  | bubble | normal | normal | normal |
| Mispredicted  Branch | normal | bubble | bubble | normal | normal |
| Combination          | stall  | bubble | bubble | normal | normal |

##### c）情况组合二

- 如下图所示，这种情况

![截屏2023-03-26 18.49.13](./6-Pipe%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-26%2018.49.13.png)

- 会出现Stall和Bubble同时出现，就会出现错误

| Condition        | F     | D              | E      | M      | W      |
| ---------------- | ----- | -------------- | ------ | ------ | ------ |
| Processing  ret  | stall | bubble         | normal | normal | normal |
| Load/Use  Hazard | stall | stall          | bubble | normal | normal |
| Combination      | stall | bubble + stall | bubble | normal | normal |

- 假设Ret指令正在Decode阶段，`mov (%rax), %rsp`在Execute阶段，那我们知道Ret指令会读取栈顶的%rsp，所以出现了Load And Use冲突，但是Ret本身自己也会带来问题。
- 如果按照Ret的处理逻辑，接下来Decode阶段产生一个空的Bubble，空指令！然后Fetch阶段保持按兵不动，原本处在Decode阶段的**Ret指令，自身这个指令！应该进入到Execute阶段**！
- 如果按照Load and Use处理逻辑，Decode阶段的指令应该按兵不动（也就是说原本处在Decode阶段的RET指令应该按兵不动），然后Execute阶段产生一个Bubble。
- 那上面描述的就出现矛盾了，Ret指令到底该不该继续动？该不该进入下一个阶段？**显然是不能的！**因为RET指令Decode阶段就依赖读取相关的寄存器，而`mov (%rax), %rsp`必须到了Memory阶段才可以把写入 `%rsp`的值确定下来！如果`ret`指令进入下一个阶段了，那将是大寄！
- 所以，`ret`指令必须**按兵不动！保持Stall状态！**
- 正确的解法是：

| Condition        | F     | D         | E      | M      | W      |
| ---------------- | ----- | --------- | ------ | ------ | ------ |
| Processing  ret  | stall | bubble    | normal | normal | normal |
| Load/Use  Hazard | stall | stall     | bubble | normal | normal |
| Combination      | stall | **stall** | bubble | normal | normal |

- 为什么？Decode阶段出现Bubble的原因是Execute或者M/W阶段发现ret的时候，希望Decode产生一个空的指令来填充，并且让Fetch不要处理后面更多的指令，以免出错！所以Decode那里变成了Bubble！
- Decode阶段出现Stall的原因是：Load/Use  Hazard，Execute阶段的指令需要写入到寄存器rA，但是Decode阶段的指令要读取寄存器rA，而Execute阶段的指令必须要到Memory阶段才能确定写入rA的值是什么。那这个时候就要把Docode阶段的指令缓一缓！不要动！让他停在那里。

这样我们就修改一下！

```
bool D_bubble =
	# Mispredicted branch
	(E_icode == IJXX && !e_Cnd) ||
	# Stalling at fetch 
	# while ret passes through pipeline
	 IRET in { D_icode, E_icode, M_icode }
	 	# 注意！这里针对RET情况，设置Bubble的条件变严格了（相比较之前的）
	 	# 只有当没有出现load/use hazard的情况，此外还有RET情况
	 	# 这个时候才能设置Decode的Bubble！！！
	  # but not condition for a load/use hazard
	  && !(E_icode in { IMRMOVL, IPOPL } 
            && E_dstM in { d_srcA, d_srcB });
```

##### d）Memory和WriteBack阶段处理

- 对于Memory阶段，一旦发现自己出现错误了，或者发现（排序在自己前面的指令，也就是已经执行到流水线后面阶段的指令）出错了，就把自己变成一个Bubble，空指令
- 目前，我们对于异常的指令的处理方法是：异常指令到达了WriteBack阶段，就让他停止下来！到了第八章可能会调用异常处理。
- 那后面的指令到底了Execute阶段或者Memory阶段，由于我们的设置，可能对于程序员可见状态有修改的流水线步骤全部变成了产生Bubble指令，相当于异常指令后面的指令全部不会被执行！

```
 # Start injecting bubbles as soon as exception passes through memory stage
 bool M_bubble = m_stat in { SADR, SINS, SHLT }
	         || W_stat in { SADR, SINS, SHLT };

 # Stall pipeline register W when exception encountered
 bool W_stall = W_stat in { SADR, SINS, SHLT };
```

#### 八、性能分析

##### a）评估方式

> 性能分析可以通过绝对和相对两个方面来衡量。

- 绝对的衡量方式：比如给你一个程序要跑多少分钟？在不同的机器？
- 相对的衡量方式：Clock-rate？执行一个指令/程序用了几个时钟周期？

##### b）CPI计算方式

- C代表时钟周期消耗了多少个，I代表要完成多少个指令，B代表插入了多少个Bubble
- 根据前面讲的 $C=I+B$
- $CPI = C/i = (I+B)/ I$
- 一般来说，平均每个指令都至少需要一个周期，但是由于一些指令要插入Bubble，所以实际消耗的要更多！

##### c）引入的Penalty

- Load and Use问题会插入一个Bubble，平均带来0.05的额外CPI
- MisPredict问题会带来两个Bubble，平均带来0.16的额外CPI
- Ret会插入3个Bubble，平均0.06的额外。
- 综合下来大约1.27！有没有可能再优化？可以！现在是一个时钟周期只能出来一个指令，后面可能甚至让一个时钟周期出来两个甚至更多的指令完成！
- Latency呢？每个指令从进去到出来，都必须5个Cycle，这个提升是非常难的，但是ThroughPut就是吞吐量就很难提升。

##### d）优化方法

- 我们设计的流水线里面，最耗时的就是Fetch阶段，Fetch又要做加法、又要读内存
- 如果把时钟周期变短可以提高效率！
- 快速提高PC增加的方法：把64位的加法拆解，拆成60和4位的，让60位的加法先做，（管他进不进一，因为60长度的做加法慢）然后4位的很快就能加出来，加完之后，再考虑是否进一，然后选择正确的结果合并。
- 这样可能可以提高效率！

![截屏2023-03-26 19.50.25](./6-Pipe%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-26%2019.50.25.png)

- 当然，也可以把一些可能要用的指令先提前读取到缓冲区，这是后面章节的内容。
