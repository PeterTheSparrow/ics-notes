---
title: 第二节 Socket
sidebar_position: 2
---

import OfficePreview from '@site/src/components/OfficePreview/index';

<OfficePreview place = "/ppt/3-10-socket.ppt"/>


## 第二节 Socket

### 一、Socket简介

#### 1）介绍

- socket interface 它最早是出现在了这个伯克利这个bsd这个操作系统下面,历史很长。
- 它是一个用户态的，socket 它可以支持 TCP IP 的这个协议，也可以支持其他的，
- 只要通过参数进行一些简单的指定，接下来的操作就都一样了
- 可以在各种网络上跑的

![截屏2023-04-12 22.44.43](./2-Socket.assets/%E6%88%AA%E5%B1%8F2023-04-12%2022.44.43.png)

- server 为了启动它要调用五个函数，如上图所示
- client，它就需要调用 3 个函数才能完成建立连接的操作

#### 2）什么是Socket

- 从Linux Kernel来看它是一个 connection 的一个端点，就是你建了一个connection，那么两头两个socket
- 从这个 Linux 的这个程序跑在上面的程序的角度来说，它和文件的描述符是一样的，都可以打开、写入、类比文件
- 下面两种结构体其实都是一样的，内存里面的结构是一样的，拿到了一个 socket address，读一下family，发现这个 family 如果是 IP socket 的话，就可以把它直接转换成上面这个格式。后面的 8 个 byte 对于 IP 是无关的

```
/* IP socket address structure*/
struct sockaddr_in  {
  uint16_t sin_family; /*Address family (AF_INET)代表是哪种socket 比如IP */
  uint16_t sin_port;   /*Port number 2Byte*/
  struct in_addr  sin_addr;   /*IP address 4Byte*/
  unsigned char sin_zero[8];   /*Pad to “sockaddr”*/
};

/* Generic socket address structure */
struct sockaddr {
  uint16_t sin_family;  /*Protocol family*/
  char     sa_data[14]; /*address data*/
};
typedef struct sockaddr SA;

```

- 为了解决域名和IP的之间的关系这两个函数就负责了这件事情。
- 一个叫 get addressing for，它的参数就是域名，把域名翻译成IP
- 另外一个getnameinfo，是把IP转化为域名。它一般是用在server 由 client 连他的时候，他是知道这个 connection 是来自于谁的，他可以拿 client 的 ip 地址去把它查出来，反过来通过 ip 地址去查域名。
- 它的背后其实是去访问 DNS 服务器，去获得相关的信息。获取的结果可能很多，所以返回是个数组而不是单个IP。

#### 3）服务端Socket

-  server 端的程序，一开始的时候，它的这个函数调用是只提供一个port，因为 server 永远是服务在这台机器上，你并不知道 client 是谁
- 协议的主体循环部分，会有两类 fd。
- 每一个 server 有一个负责监听的这个fd，它用来监听当有 client 连你的时候，你的 listen fd 是会收到相应的消息
- 一个 server 会对应很多成百上千的client，一个listen fd肯定不够，所以每个 client 连你的时候， server 端都会自动去创建一个 connect f d。
- 如果有 100 个 client 连一个 server 这边会有一个 listen f d 在那边监听，但是会创建 100 个 connect f d，

```c
 	listenfd = Open_listenfd(argv[1]);
 	while (1) {
 	      clientlen = sizeof(struct sockaddr_storage);
 	      connfd = Accept(listenfd, (SA *)&clientaddr, &clientlen);
 	      Getnameinfo((SA *) &clientaddr, clientlen, client_hostname, 
 			  MAXLINE, client_port, MAXLINE, 0);
 	      printf("Connected to (%s, %s)\n", client_hostname, client_port);
 	      echo(connfd);
  	      Close(connfd);
  }
  exit(0);
}
```

- 它调用 accept 去等待，注意一下 accept 不是马上返回的，调用了之后整个 server 会被挂起 suspend 起来
- 有 client 连你的时候，你会从这个 accept 里面出来，返回的时候，会带回这个由操作系统帮你创建的 connect FD，帮你已经建好了这个 connect f d 就对应了某一个 clients 你和它之间的 connection 的一头。
- 可以用这个 connect fd 和对面进行联系
- 当客户端关闭连接的时候，Server会收到EOF，这时候就可以关闭了

