---
title: 第二节 Robust和STD IO 
sidebar_position: 2
---

## 第二节 Robust和STD IO 

> 既然 Unix IO 和Std IO都存在，它们都有价值。甚至我们还会介绍Robust第三种IO，他们会有不同的侧重点。

### 一、RIO

#### 1）Unbuffered

- Rob IO 就是一个基于 Unix IO 的一个包装的库。是一个比较健壮的IO，相对于UnixIO。可以提供一些 Unix IO 没有提供的这个功能。
- Rob IO提供了两套UnixIO没有的功能，一个叫做Unbuffer 。没有缓冲的读和写，但是它可以保证读 n 和 n 个字符。Transfer data directly between memory and a file, with **no application-level buffering**

```c
#include "csapp.h"
ssize_t rio_readn(int fd, void *usrbuf, size_t count);
ssize_t rio_writen(int fd, void *usrbuf, size_t count);
return: number of bytes read (0 if EOF) or written, -1 on error
```

- 如下代码所示，如果读取的过程中出现了终端，他会持续的尝试读取

```c
ssize_t rio_readn(int fd, void *buf, size_t count)
{
    size_t nleft = count;
 		ssize_t nread;
 		char *ptr = buf;

 		while (nleft > 0) {
 		    if ((nread = read(fd, ptr, nleft)) < 0) {
 		        if (errno == EINTR)
 	            nread = 0; /* and call read() again */
 	          else
 	            return -1; /* errno set by read() */
 	    }
 	    else if (nread == 0)
 	        break; /* EOF */
 	    nleft -= nread;
 	    ptr += nread;
 	}
 	return (count - nleft); /* return >= 0 */
}

ssize_t rio_writen(int fd, const void *buf, size_t count)
{
 		size_t nleft = count;
 		ssize_t nwritten;
 		const char *ptr = buf;

 		while (nleft > 0) {
 		    if ((nwritten = write(fd, ptr, nleft)) <= 0) {
 		        if (errno == EINTR)
 	            nwritten = 0; /* and call write() again */
 	        else
 	            return -1; /* errorno set by write() */
 	    }
 	    nleft -= nwritten;
 	    ptr += nwritten;
 	}
 	return count;
}
```

- 注意，文件读写的指针位置是有内核负责的，我们这里不操作。
- 这样的代码才能保证比较完整的读出你想要的数据。

#### 2）buffered

- 另外一个是BufferdIO，又加入了一个缓冲区，为什么？
- IO 读写是很慢的来读文件，它其实这个文件大部分情况下在磁盘或者在网络，它都要比内存 CPU 操作要慢非常多，可能是要超过这个1万个 cycle 这个才能去做。
- 如果你每一次操作都去从磁盘上面去读，那就会读得非常慢的，或者从网络上面去读得非常的慢，但有些情况下你又不太敢读太多，或者说你一次这个上面的应用程序，他就想读一个读，那么这时候我们就需要有缓冲区，而这个缓冲区是称为 application level 的，就是应用程序自己管的缓冲区。
- Unbuffer的想法是：一次从磁盘里面多读一些，放到这个缓冲区里面，这样的话我后面的读写都可以从这个内存里面直接读
- 一样的写操作，我也可以 buffer 起来，你的写我不帮你直接写到磁盘里面去，先在内存里面攒起来，攒完了之后再一次性的写回去就可以了。
- 这样，对于一个文件的读写就可以有下面的四个部分
  - 最前面的是不在缓冲区里面
  - 绿色的是缓冲区里面已经读取的
  - 红色的事缓冲区没有读取的，如果unread大小变成了0，说明Buffer要继续读取数据了
  - 后面的是unseen，是还没开始的读取的数据
  - 下图里面还有一个Current File Position，这个是操作系统对应文件标识符读取的文件指针。为什么呢？尽管unread部分还有，假设，但是操作系统只会记录Buffer已经读取到的部分。unread只是应用程序没有读取到的部分

![截屏2023-04-12 16.39.11](./2-Robust&StdIO.assets/%E6%88%AA%E5%B1%8F2023-04-12%2016.39.11.png)

- 这样就有下面两种接口：

```
#include "csapp.h"
void rio_readinitb(rio_t *rp, int fd) ;
ssize_t rio_readlineb(rio_t *rp, void *usrbuf, size_t maxlen);
ssize_t rio_readnb(rio_t *rp, void *usrbuf, size_t maxlen);
returns: number of bytes read (0 if EOF), -1 on error
```

- 那么读支持两种，一种是 line buffer，就是我读一行，一行是以回车为结尾的一行字符。还有一种就是读 n 个bytes，两种都可以，这两种会比之前的读要快很多。之前每次都要调用 system call，现在可能如果已经在缓存区域里面，就可以直接返回上面了，不需要系统调用

- short count：有了这个 buffer 的时候，它其实会增加 short count 的可能性。比如说如果我这个 buffer 开的比较小，而我每次要读很多东西的话，它是必定会发生 short count 的。假设buffer大小20，每一次读都读 40 个byte，每一次都会需要读多次的这个 IO

### 二、Std IO

- C的标准库，也是我们用的最多就是STD IO
- Opening and closing files (fopen and fclose)
- Reading and writing bytes (fread and fwrite)
- Reading and writing text lines (fgets and fputs)
- Formatted reading and writing (fscanf and fprintf)

- 操作系统里面， Linux 把下面所有的 IO 设备都抽象成了文件，STD IO进一步在文件基础上把它抽象成了一个流。
- 流的概念和文件有什么差别？流同样是可以读，可以写。但是差别在于：文件你往往可以确定到一个位置，然后进行指定位置的读写这个像是随机的跳来跳去的读，但是 stream 它像一个数据流一样，它流过来，所以一般在流上面的这个读写，它只能是连续的，连续的读，或者我连续的往里面追加这个数据。

> 回忆我们第一部分的Buffer？什么缺点？假如读到一半的时候我想要变更读取的文件的位置。你要换一个位置去读，那么你当前的那数据已经读上来，这时候就会出现的有两个位置：应用程序理解的当前位置和操作系统这边的当前文件位置不一样

- 所以，StdIO就在上面的Buffer基础上，改为了抽象为流，告诉用户我们的控制仅仅有限。在读的时候我就不能支持写
- 所以三个stdIN、stdOut、stdErr三个流分别对应fd=0、1、2

> 注意输出Buffer，printf的时候，一般情况是是不会直接写到这个设备上的。 print f 的它的语义是只有两种情况会触发写操作，真正的写操作，否则就只是写在内存里面。
>
> - 一种是首先自己主动的调用 f flash，你把它把整个这个缓冲区，这个 buffer 里面内容全部刷到这个屏幕上。
> - 另一种出现换行符。
> - 所以想用 printf 去标记有没有执行到当前位置的时候，一定要加上这个回车！否则看到没有输出，可能只是输出到内存，没有输出到屏幕

### 三、选择什么IO

- UnixIO：
  - 是首选，最通用的它是直接建立在系统 call 上的，它能够提供最好的这个性能。如果需要Buffer，自己根据自己的特点Buffer。他没有间接层。
  - 此外如果想看这个文件最后的打开时间，看这个文件的大小，这些只有 Unix IO 提供。
  - 只能使用 Unix IO：async signal safe，它里面调用的函数必须是异步，安全的。如果用printf有Buffer，就不安全
  - 容易写错的代码： 要使用short counts的实现，这些可以用指定的库实现，节约时间
- STD IO
  - 优点就是它提供了buffer，在简单的使用的时候，性能很好。能够解决一些明显的像short count 的这些问题
  - 但是功能上面受限，有些场景不能使用，
  -  stream 这个抽象，是一个高层次的抽象，引入了新的限制，不能同时读写，必须flash之后才能读取得到
  - 不适用网络编程，比如网络是双工的，继续要读也需要写。如果非要用stdIO，那我就需要open两次，但是关闭的时候只能关闭一次，这样代码就很奇怪
- RIO
  - 比较适合网络编程
  - 后面章节网络里面所有的代码的示例，我们都会使用这个 RO 这一套

- 最终规则：
  - 能用 high level IO 解决的事情尽量用 high level IO 来解决，因为他做过包装，做过一些优化，还有一些功能上的扩展
  - 用不了的一些场景底下才去选择，其他的来使用才来使用。