---
title: 第一节 Network
sidebar_position: 1
---

## 第一节 Network

> 介绍网络编程的一个最简单的一个model，以及网络本身它的一个主要的一个抽象

### 一、Client-Server Programming Model

- 首先网络它是两台机器之间互联，Network APP是指这个具有网络访问另外一台机器的这个能力的这个应用程序，早期大部分都是基于 clients server model 的，就是有两个角色
- 在这个网络编程里面有一个角色是叫 client 客户端，另外一个角色叫server
- web 访问网页，那么你们的 browser 这个浏览器它其实就充当的是一个clients，你去访问然后提供这些网络信息的，不管是搜索引擎、社交媒体这些都称为server。
- FTP，我们去下载，那么我就是有 FTP 的clients，文件会存在这个 server 端。
- Linux 下面的这个可视化的这个图形界面，它就是一个 client server，显示器其实就是server，从client 的方式提交相应的信息，让它显示在屏幕上！
- 所以Client-Server只是个模型，一个机器可能同时是客户端、服务器
- server 是一个整体，它去负责管理这个资源，可以同时应对很多的这个clients，是一个一对多的模型
- 网络本质也是一个IO设备

![截屏2023-04-12 19.12.06](./1-Network.assets/%E6%88%AA%E5%B1%8F2023-04-12%2019.12.06.png)

### 二、Network

- 网络是一个分层的结构
- 最底层的事local 的 area network
- 把这些 local 的 area network 组织在一块，变成一个更大的网
- 你的机器进入网，你也可以认为你是进入到多个网不同层次的。
- 最流行的网就是以太网

#### 1）Hub

- 从 LAN 开始讲，那么两三台机器，三四台机器，例如一个寝室，就可以插在一个小的 hub 集线器上
- 因为Hub设备简单，功能弱，不能区分发进进入到这个寝室的这个数据信息
- 这个包是发给谁的？Hub采用的是广播的方式，也就是说进入到你们这个 land 里面的所有的消息是会发给每一台机器的。
- 之所以别的机器没有收到，因为机器网卡会主动做一个过滤
- 所以尽管简单，还不太安全。
- Hub上面有一些指定功能的程序，上面直接放一些指定功能的程序。一个典型的所谓的以太网它其实可以认为是一个协议或者标准
- 在整个网络里面，你怎么说明是自己?所以 naming 是一个很重要的东西.是 48 位的一个地址，以太网地址用来标识你,所有的相应的网卡，它其实都是会有对应的这个以太网名字的
- 在以太网上面传递的东西叫做frame，就是你发送在上面的这个数据

#### 2）bridge

- 在Lan层次上面，可以认为一栋楼或者一个校园都可以放在一块

![截屏2023-04-12 19.28.52](./1-Network.assets/%E6%88%AA%E5%B1%8F2023-04-12%2019.28.52.png)

#### 3）router

- 如下所示，不同网段的通讯

![截屏2023-04-12 19.31.15](./1-Network.assets/%E6%88%AA%E5%B1%8F2023-04-12%2019.31.15.png)

- LAN和WAN（Wide Area Network，广域网络）一个最大的一个区分就在于这边 WAN 它可能是一个异构，LAN是同构，用的协议都是一样的。
- LAN1和LAN2被连在一块形成了一个 WAN 之后，他们两个网络可以完全不一样，例如 Wifi 的协议、以太网协议等等，所以Router功能很强大
- 这就是网络建起来的一个概念，分层。两个机器通讯，可能经过了多次Router的转发。那么这些都被隐藏起来。Router里面会跑一些自己的协议，这些协议的功能不但可以帮你找到对面的人，还可以帮你找到一条去那边人的路径。

#### 4）网络协议

##### a）简介

- 如果在LAN和WAN之间发送信息，怎么办？
- protocol software就是同构运行在Host和Router上面的，它是一套软件，或者也称为一套网络栈，它是一套软件，那么这套软件能够去实现我们前面说的定位主机，然后去 Router 这些。这个 software 不一定是跑在你的机器上的，你机器上面跑着一部分，像那些硬件的 router bridge 里面其实也跑着软件。
- 所以当你发送的时候，会通过网络API，调用SystemCall，进入到内核，内核里面有相应的网络协议栈，就是这些 protocol software，根根据这些软件它可以给你的这个消息进行一个封装，然后把这个消息扔到这个消息扔到这个网络上，这些 router 会帮助你把这个消息传递到你的目标的这个机器上。

##### b）作用

- 网络协议的功能：
  - 提供一个命名的模式，网络内部的每一个机器至少要被分配一个独一无二的地址
  - 提供传递机制，定义一个标准的网络传输单元，也就是packet，同时packet包括Header和Payload。Header里面包括包的大小、发送起点终点，Payload包括传输数据的发送的Bit位

### 三、GlobalIP

#### 1）七层模型

- 七层网络模型，标准化组织就尝试把网络的整个功能去分成了 7 层，从下往上是从硬件到软件
-  physical 这一层规定的是你这个网络硬件统一的规范，比如网卡要插PCIE接口
- 网络层和链接层，这两个都比较偏硬件，传输就前面我们说的 deliver 这些数据包

![截屏2023-04-12 21.03.00](./1-Network.assets/%E6%88%AA%E5%B1%8F2023-04-12%2021.03.00.png)

- 这个网络栈没有被使用一般，现在所运行的这个系统，我们一般遵循的是右边这个四层结构（山姆的四层）
- link 这一层的典型的协议：可以有以太网、Wifi
- 网络这一层主要就是 IP 协议
- 应用层就是HTTP，POP3，FTP、

#### 2）IP

- IP就是Internet protocol，提供基本的命名模式，以及不可靠的host到host之间网络包的传输
- 基于TCP/IP协议，在传输层有TCP和UDP协议
  - TCP：传输控制协议，使用IP来提供可靠的比特流，丢包会重新发送
  - UDP：使用IP提供不可靠的数据流，简单理解就是丢包了不会重新发
- IP是32Byte，例如0xca7828bc（用int32存储），记不住？
  - 可以变成好记的，比如分段，范围0-255每个部分。59.78.48.118
  - 或者用域名ipads.se.sjtu.edu.cn
- 有了这个 ip 地址，我们就可以构建一个数据结构，这个数据结构到时候可以用来初始化你对面的这个链接，就像文件名可以用来初始化打开一个文件一样。
- 网络上面传输的数据，他这个因为历史遗留问题，它正好是一个 big ending！但是我们一般x86都是Little Endian
- 所以可能需要一些转换函数，如下转换IP地址

```
#include <arpa/inet.h>

uint32_t htonl(uint32_t hostlong);
uint16_t htons(uint16_t hostshort);
Returns: value in network byte order

uint32_t ntohl(uint32_t netlong);
uint16_t ntohs(uint16_t netshort);
Returns: value in host byte order
```

> 网络这边提供的操作系统的这个接口，我们称为 socket interface
>
> - 在transport 层和 application 层之间，可以认为是操作系统给出的这个 interface 给出的这个 socket 的这个接口

#### 3）域名

- 专门给人看的，好记忆
- 域名可以理解为一个倒立的树。
- DNS：域名解析服务器，认为一个表，映射域名到IP地址

- 一般一个域名对应一个IP，但是多个域名可能对应同一个IP

```
nslookup whaleshark.ics.cs.cmu.edu
```

- 当然，域名可能对应多个IP

```
admin@Mac-Studio ~ % nslookup twitter.com
Server:		2001:da8:8000:1:202:112:26:40
Address:	2001:da8:8000:1:202:112:26:40#53

Non-authoritative answer:
Name:	twitter.com
Address: 104.244.42.193
Name:	twitter.com
Address: 104.244.42.1
Name:	twitter.com
Address: 104.244.42.65
Name:	twitter.com
Address: 104.244.42.129
```

- 当然，也可能存在空壳域名，比如没有指向任何IP
- 注意localhost代表本机的域名，对应的IP是127.0.0.1

```
admin@Mac-Studio ~ % nslookup localhost
Server:		2001:da8:8000:1:202:112:26:40
Address:	2001:da8:8000:1:202:112:26:40#53

Name:	localhost
Address: 127.0.0.1
```

### 四、connection

#### 1）Connect

- 网络连接有什么特点呢？
- 两台机器要通信，除了要IP名字之外，不管哪种基于这个要去建立一条链接，这条 connection 建立起来了之后，我们才能基于这个 connection 进行传输。
- 至于这条 connection 实际到物理上是经过有线网还是 Wifi 还是什么样子，取决于硬件。
- 第一个 connection 是点到点的
- connection是全双工的
- 然后它是一个 reliable 的传输，就是建立的这个connection。无论网络是否发生丢包还是什么，都可以收到
- 任何一个connection，它其实是由两端的 socket 组成来标识这个connection。
- 这个协议那么到什么时候结束？一般是由 connection 是由 client 建立的，client 关闭这个 connection 的时候， server 端会收到消息，相当于是一个生命周期。

#### 2）socket

- socket是连接的终端，socket地址就是 `IP:Port` 的格式，它比文件的 f d 要复杂一些，
- port 来说明你是这台机器上的某一个connection，它的位数小一点，它是 16 个bits
- well-known port：最早被提出来的，默认的端口，比如http是80端口，https是443