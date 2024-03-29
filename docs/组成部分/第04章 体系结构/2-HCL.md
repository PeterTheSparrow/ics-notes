---
title: 第二节 HCL
sidebar_position: 3
---

import OfficePreview from '@site/src/components/OfficePreview/index';

<OfficePreview place = "/ppt/2-2-hcl.ppt"/>

## 第二节：HCL

### 一、电路

- 模拟电路它这个信号是一个连续的，在一个范围内它会连续变化，所以很难的建模，不适合用在CPU。比如手机上那个天线，那它就是个模拟电路，它就是个模拟信号，那么这个模拟的这个东西，它就比较难以建模，比较难于自动设计。因此CPU一般使用的数字电路。
- 模电比如电压从0升高到1，需要经过一个渐变的过程，那你中间这个渐变过程对于CPU到底算啥对吧？你不要的那个东西出来以后算啥？我们要想个办法，就叫瞬间饱和。

### 二、三种门

- 逻辑门是数字电路的基本计算单元
- 与门、或门、非门（根第二章的一样）
- 响应的时候是会有一些延迟的，例如对于与门来说，假如之前$a \&\& b =0$, 现在变成了$1$,那么这个输出的电压是会有一定的延迟的，不会是立即变化的。

![截屏2023-03-05 12.19.24](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2012.19.24.png)

### 三、组合电路

#### （一）HCl

- 输入变了，输出就会变的这种电路我们拿来做计算单元，例如ALU，我们的算数逻辑运算。
- 当然会有一些叫做存储，比如说我们的 register 寄存器这样一些东西存储信息的，为了保证信息不能随便就改变，我们就需要有一个控制的信号，这个就叫做时钟（比如我们买计算机说的主频，从信号的第一个上升，到第二个上升，在1s内的次数就是主频）这种信号用来控制存储。
- 组合电路就是一些与、或、非门，比如说一个门的输出去接到另外的一个门输入去，和另外的一个门相接，那么这样的话他就而且注意到他不能说，比如说这个跟另外一个输出门连结了，那么这边这个输出不能再回来这个的输出，这样会带来歧义。
- 例如我们可以用下面的方法，设计出一个位`eq`的判断电路。

![截屏2023-03-05 12.33.30](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2012.33.30.png)

- 那如果说我们设计 CPU 都拿这种上面的电路（一个一个组合的）这样一个话，那我们大概就设计不出来了，太复杂。于是乎书的作者就设计了HCL硬件控制语言，用这么一个Bool表达式来描述这么个电路，你就画这么一个电路，其实就可以用我们的程序语言去写这么一行。
- 再例如，下面的的方法可以判断Word相等的。（可以看到HCL表示更简单）

![截屏2023-03-05 12.43.59](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2012.43.59.png)

- 但是最终CPU还是由电路组成的。

#### （二）多路选择器

##### a）Bit多路选择

- 多路选择器如下所示，当s=1的时候，输出a，当s=0的时候，输出b
- 作用是从多个信号输入里面，选择一个信号输出。

![截屏2023-03-05 12.47.02](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2012.47.02.png)

##### b）Word多路选择

- 多路选择的图如下

![截屏2023-03-05 12.51.32](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2012.51.32.png)

- 使用Case来表示HCL（用传统的HCL不好表达）：

```
Out = [
	S : A;  # S成立的情况下
	1 : B;  # 默认情况下，类比C++ switch的 default
]
```

##### c）Word四路选择

- 如下图，可以写出HCL表达式
- 根据`00,01,10,11`的输入来选择

![截屏2023-03-05 12.55.10](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2012.55.10.png)

#### （三）组合电路总结

- 上面说的这些电路都是组合电路，组合电路的输出，它是随着这个输入的变化而变化，就你一旦输入有变化，它的输出经过一定的延迟之后一定会发生变化。那么这个组合电路在我们设计 CPU 的时候，一种是用来设计我们的控制的部分来设计我们的控制，还有是用来设计我们的这个算术逻辑单元。
- 具体的设计比较复杂，不做解释

### 四、时序电路

#### （一）概述

- Clocked Registers时钟寄存器（这个和我们之前学的rax这些寄存器不一样）它可以在里面保存一些信息（保存单个Word或者几个Bits）使用一个时钟来控制。
- 时钟信号我们前头已经提到过了，它是一个周期性变化的一个这么一个波形，当然它也不是个电信号，但是有一定的周期性，一会高一会低。
- 如下图所示，当稳定状态下，输入是y，时钟寄存器状态是x，输出就是x
- 当时钟信号发生变化的时候，加载输入的y，此时寄存器状态变为y，然后输出变成y。
- 至于之后输入变成什么，只要时钟信号不变，哪怕输入改变，输出也不会受到影响。

![截屏2023-03-05 13.07.09](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2013.07.09.png)

- 我们说时钟周期越短，效率也高，也不是说可以无限的压缩时钟周期，如果时钟周期太短，一些计算还没有算完就要求输出的时候，可能会输出一个错误的值，这反而不可以。所以压缩也只能适度。

#### （二）状态机举例

我们的例子是这样的：

- 这个MUX是一个多路选择器，如果Load的输入是0，就会选择ALU的作为输出，如果Load输入的是1，就会选择In这一路作为输出
- Clock按照我们刚刚讲的，每次Rise的时候，才可以加载Input。

![截屏2023-03-05 13.20.19](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2013.20.19.png)

> 这一部分的图非常多，有些难理解。每个图我都写了详细的注释。

##### a）初始状态

- 如下图所示，In的输入对应X0，此时因为Load是1，所以MUX的输出是X0
- Clock的输出是什么我们不知道，取决于上一个时钟周期Rise的时候，加载的输入值。

![截屏2023-03-05 13.22.04](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2013.22.04.png)

##### b）Clock电压上升

- Clock的电压上升，现在需要加载上一步骤Clock的输入（也就是X0），输出X0
- Clock的输出又反过来作为ALU的输入，假设我们ALU做的是加法，此时因为Load的电压也发生了变化，Load的电压变为了0，MUX多路选择器会把ALU的输出作为MUX的输出，此时Clock的输入就变成了X0+X0
- 但是，Clock会改变输出吗？这么一圈下来也不会，因为Clock改变输出只会在Clock的电压上升的时候加载输入，所以哪怕输入变了，因为时钟周期还没有到，所以输出保持还是X0！

![截屏2023-03-05 13.23.47](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2013.23.47.png)

##### c）输入In变更为X1

- 假设这时候，我们的输入变更为X1，由于Load没变，MUX输出就是ALU的输出，
- ALU的输出是什么呢？因为In是X1，ALU会把Clock的输出和In的输入做加法，也就是X0+X1，ALU输出X0+X1

![截屏2023-03-05 13.29.04](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2013.29.04.png)

##### d）Clock电压再上升

- 此时，因为Clock的电压经过了再次上升，Clock加载输入作为输出，所以输出变成X0+X1
- ALU计算求和结果，输出X0+X1+X1，经过MUX选择输出，Clock的输入变成X0+X1+X1

![截屏2023-03-05 13.31.19](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2013.31.19.png)

##### e）输入In变更为X2

- 现在，假如输入变更为X2，经过ALU、MUX，Clock的输入就变成X0+X1+X2，Clock的输出不变，因为时钟周期没变。

![截屏2023-03-05 13.33.59](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2013.33.59-7994445.png)

##### f）Clock电压再上升

- 现在，经过Clock电压再上升，Out变成了X0+X1+X2

![截屏2023-03-05 13.35.47](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2013.35.47.png)

##### g）Load电压上升

- Load电压上升，MUX输出In对应的值X3

![截屏2023-03-05 13.40.12](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2013.40.12.png)

##### h）Clock电压上升

- Clock电压上升之后，加载输入作为输出，就回到了最开始的状态了

![截屏2023-03-05 13.41.29](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2013.41.29.png)

- 此后以此类推，如下所示：

![截屏2023-03-05 13.42.29](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2013.42.29.png)

#### （三）Register File原理

> 我们刚刚说的是clock Register，是一个只存一个信息的，那么像我们的内存或者寄存器文件，我们要存储一组信息的，Y86的寄存器文件有15个，我们的Memory就更大了，那这些就叫做随机访问存储。（两个代表：一个寄存器文件、一个是内存）他们的特征是存储了多个Word？我们要有对应的地址作为Input。

- 以下图为例，寄存器文件：
- 这个箭头往里的都是输入，反之输出
- 左边的是Read Port（两组），右边的事Write Port（只有一组），每一个读写口都有对应的地址（例如srcA、srcB、dstW都是地址，valA/B都是输出）
- 当地址为F(4个1的)的时候，读写端口是不起作用的（无效的）

![截屏2023-03-05 14.01.26](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2014.01.26.png)

##### a）读信息的时候

- 类似组合电路的原理（和Clock没什么关系）
- 给定一个输入，过一段时间就把输出给你（比如我要2号寄存器的内容，给定输入一段时间可以得到输出）
- 可以看到有两个读口，所以支持同时读取两个数据出来

##### b）写信息的时候

- 等待Rising Clock的时候，才能够写入（只能有一个在写）
- 后门讲到push/pop的时候可能出现两读两写的，但是最终实际还是一个读口
- 所以类似时序电路的原理

![截屏2023-03-05 14.09.35](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2014.09.35.png)

#### （四）Memory原理

- 有两个输入，无论是读还是写，都需要有一个address（要获取或者写入哪个地址）
- 当然写的时候还要传进去Data In（读的时候不需要）
- 控制信号看虚线，不能这读写两个都是1，又读又写不行
- 地址如果超界会报错，不像寄存器，只有四个位，肯定不可能越界
- 和上面同理，读是组合电路行为，写是时序电路的行为，当时钟上升的时候，信号就写进去了

![截屏2023-03-05 14.15.23](./2-HCL.assets/%E6%88%AA%E5%B1%8F2023-03-05%2014.15.23.png)

#### （五）应用总结

- 时序电路有两个应用：
  - Clocked Registers：例如PC、CC，当时钟上升的时候加载输入
  - 随机访问内存： 可以存储多个Word，可能有多个读写口。读是组合电路的行为，写是时序电路的行为，等待时钟信号上升才写入。

