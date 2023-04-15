---
title: 第三节 WebServer
sidebar_position: 3
---

import OfficePreview from '@site/src/components/OfficePreview/index';

<OfficePreview place = "/ppt/3-11-web.ppt"/>

## 第三节 WebServer

> browser 可以认为是一个功能比较强大的 web clients。而我们的话会介绍一个功能比较简单的client

### 一、WebServer协议

#### 1）协议

- web server 用的协议，我们称为超文本的协议，传图片，想传视频，那么这套协议是基于 web 网页的，它网页里面包含了各种信息，所以他这个称为超文本传输协议。它假设你下面是个TCP，然后这个 client 和 server 在 TCP 之上来传输这个内容，它把这个超文本的这个被包含在你这个通过 connection 发送的消息里面。
- 你可以认为写的是一些超文本的请求， server 端返回的你是超文本的 response
- WebServer建立在TCP/IP上面
- 当 server 端收到了一个 HTTP request 的时候，它会对 request 进行一个解析，从这个 request 里面它可以读懂你这个 client 到底要什么资源，所以返回的时候 web server 就会根据你的请求找到相应的内容，生成一个叫做 HTTP response，就是就是它也符合这个 HTTP 的这个格式。

#### 2）静态动态

- 请求的内容包括静态的和动态的，静态的是谁请求都一样，最典型的就是一些网页、图片、音频、视频这种
- 动态的是指结果和你的请求是相关的，它需要在你的请求到达之后，它才能去生成对应的结果，再进行一个返回。

#### 3）URI

- 指的是Universal Resource Locator，web 的这个HTTP 请求其实是要 server 端的 web content，是一种资源，我们需要有一个全局的去标识它的，我们要告诉 server 我要哪一个资源
- 资源其实类似使用目录结构下面的资源
- 动态的类似下面的，可以请求某个资源，不能空格，空格都会被转换成什么百分号20

```
http://www.cs.cmu.edu:8000/cgi-bin/adder?15000&213
```

- URI三个部分：
  - 前缀，协议
  - host：主机名字
  - 端口：端口对应进程
  - 后面斜杠：资源的具体情况，例如相对于服务器的工作目录下的情况

#### 4）静态调用请求

- 如下所示，请求的三个部分：Method、URI、协议版本

```
//Client: open connection to server
unix> telnet ipads.se.sjtu.edu.cn 80
//Telnet prints 3 lines to the terminal
Trying 202.120.40.85...
Connected to ipads.se.sjtu.edu.cn.
Escape character is '^]'.
//Client: request line
GET /courses/ics/index.shtml HTTP/1.1
//Client: required HTTP/1.1 HOST header
host: ipads.se.sjtu.edu.cn
//Client: empty line terminates headers
```

- 返回的结果

```
//Server: response line
HTTP/1.1 200 OK
//Server: followed by five response headers
Server: nginx/1.0.4
Date: Thu, 29 Nov 2012 10:15:38 GMT
//Server: expect HTML in the response body 
Content-Type: text/html
//Server: expect 11,560 bytes in the resp body
Content-Length: 11560
//Server: empty line (“\r\n”) terminates hdrs
```

#### 5）动态调用请求

- CGI：URI包括“/cgi-bin”,默认就是动态的内容，它不能使用原来的这个主进程去执行这个程序，server 会创建一个子进程，然后由子进程去执行你请求的这个二进制文件。这时候会 Fork 出一个子进程，然后用 Execv 去执行这个程序。
- 最后这个结果的这个执行的这个输出返回给server，返回给 client 就可以了
- 问题：client 怎么把参数从一台机器发送给另外一台机器？
- 问题：server 怎么把参数传给他 fork 出来的这个child，
- 问题：我一个子进程执行完了之后，这个结果怎么返回出来，怎么拿出来？
- cgi 其实给出了一种可能的solution
- 解决一：通过URI来传递参数，问号后面跟一系列字符串，不允许空格，空格必须转义。不同参数通过And符号连接
- 解决二：server 并不处理这个参数，反正是要传给你这个具体的程序的，让程序自己去做就行了。所以他这边采用的是全局的环境变量。query string 就直接把整个问号之后的部分作为 query string 传递给这个动态网页的这个可执行程序。例如下面的这些API，可以让程序知道甚至远程用户的IP等等信息

```
Request-specific
QUERY_STRING (contains GET args)
SERVER_PORT
REQUEST_METHOD (GET, POST, etc)
REMOTE_HOST (domain name of client)
REMOTE_ADDR (IP address of client)
CONTENT_TYPE (for POST, MIME type of the request body )
CONTENT_LENGTH (for POST, length in bytes)
```

- 解决三：执行完了怎么返回？进程之间传递的方法非常麻烦，使用了dup2的方法。就是把某一个 fd 对应的打开的这个文件的句柄变成另外一个，可以让这个 child 的输出是打到屏幕的，但是我把它这个 standard out 变成了什么呢？变成了直接给 client 的，把这个 standard out 和这个 connection 连接到一块，

### 二、Tiny Web Server

- 一个非常简单的一个 web server，可以支持 get 操作，支持静态和动态网页。
- 和真正的 web server 相比，它不够完整。
- 是Sequential的处理，一个一个处理按照顺序
- 只支持GET方法，但是其他的都不支持，返回的是Error。
- 总是会返回的！
- 遵守CGI规范，如果请求的URI带有cgi-bin的目录，他就会执行

> 代码里面有一个MMap的，什么作用？

![截屏2023-04-13 17.31.24](./3-WebServer.assets/%E6%88%AA%E5%B1%8F2023-04-13%2017.31.24.png)

- 例如这个函数就是用来服务静态网页的！MMAP 的这个机制，有什么作用呢？
- 写文件原来你可以打开文件，然后文件读出来，读到这个就这个内存里面，然后再从内存往这个网络上面去写一类。但是这样很麻烦！两次拷贝！能不能直接把文件的内容输出到网络的IO
- 这边调用的是 m map 这个函数，m map 是一个映射，它会把一个文件直接映射到内存，你文件比如说有 100 个byte，会映射到内存里面的 100 个bytes，它建立一个映射关系，但是它并没有真正的 copy 上去。建立映射了之后，我只是建立这个关系。当我真的去读这个内存的时候，读内存就和读文件一样，它会自动触发从磁盘往文件的这个 copy 的过程。
- 有了这个 m map 之后，我不需要直接去读了，因为我知道这个文件大小对不对，然后我也不需要去做这个相应的这个修改之类的，我只是要读一遍，从头到尾读一遍，那么我直接和内存做一个映射，然后真的读的时候，真的去访问这个内存的时候才会去 copy 到内存里面。
- 在这里的TinyWebServer，我是需要把文件输出到网络，建立映射之后，因为操作系统知道你有个映射，然后你又想把这个这块内存往一个 IO 上面写，这样的话它就不会往你的内存靠了，它直接就往网络上面走了，所以它相对会快一些，代码也比较简单。

### 三、Proxy

- 模型：

![截屏2023-04-13 17.40.51](./3-WebServer.assets/%E6%88%AA%E5%B1%8F2023-04-13%2017.40.51.png)

- Proxy的作用，它会使得你的请求感觉上会变慢，但是为什么呢？

  - 可以进行一个缓存，类似于 cache 的这个东西
  - 可以做代理：比如校园网外面可以通过VPN访问校园内部网络
  - 可以做检查，安全过滤之类的，Proxy既可以作为client也可以作为server

  

