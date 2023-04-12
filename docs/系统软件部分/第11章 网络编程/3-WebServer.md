---
title: 第三节 WebServer
sidebar_position: 3
---

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