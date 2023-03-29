---
title: 第一节 Unix IO
sidebar_position: 1
---


## 第一节 Unix IO

> 我们知道进程这个抽象虽然是我们针对下面 3 大类硬件，CPU、内存和外设有三个抽象，进程，虚拟内存和IO。进程它本身本质上应该包含了三种设备，因为你一个进程它需要同时去分配内存和 IO 设备进行交互。第8章里面主要介绍的其实是进程和 CPU 相关的这一部分，主要是这个进程的创建、回收以及进程间的一些通信交互等等一些内容。这个章节我们会开始介绍IO，这个内容相对会少一些。

> 除了 CPU 和内存，在操作系统看来都属于外设，都属于这个 input output 这个系统，但是当提供了文件这样一个抽象了之后，它可以以统一的方式去进行处理。它最大的一个好处，这个抽象的一个好处就是使得你和外设的交互变得非常的简单，

### 一、Unix IO

#### 1）为什么学习UnixIO

- IO 是 input 和 output 的一个缩写，是整个计算机的外设部分。除了 CPU 和内存之外都属于外设，从显示器到鼠标到 u 盘到各种的这个外接的、无线的方式的链接的都属于这个 IO 设备。
- 我们从应用层的这些可以认为是标准 IO 库，最典型的就是`printf`
- 标准 IO 库并不是直接建立在Kernal内核之上的！那么在它之下，在Kernal之上有一层叫做 Unix IO 的 Unix IO，它提供的是直接的，相当于是对Kernal的系统调用的一个包装。
- 学习这些 Unix IO，主要是理解这些这个 IO 进程相关的一些这个原理。
- 有些同学用过 memory map，那它其实就是 memory 内存和 IO 的一个结合的部分，就是你通过映射的方式来读取磁盘上的数据，但是它会被直接映射到内存里面，那这就是 IO 和内存的交互。
- 一些场景下只能选择 Unix IO！比较典型的就是像 signal handler 里面的打印，你只能去选择这些没有包装过的，因为那些包装会使得你这个函数变得不安全。

#### 2）UnixIO组成

-  IO 抽象把所有的外设都抽象成了文件。Unix 文件它可以认为是一个bite的流。整个文件里面全部都是byte，首尾相连加连在一块。
- 这些设备被抽象了文件了之后它的最大的好处，使得操作系统能够提供统一的接口。
- 例如我们在做Lab2的时候，可能使用重定向来输入拆弹密码，也可以看出文件磁盘上的文件和你键盘输入，它在这边就被操作系统统一在了一块。
- 所有的外设的相关操作可以被抽象为**读和写**两个操作！

#### 3）文件的类型

- regular file ：经常能够接触到的，一个真实的文件，在磁盘上找得到的。可以进一步细分为text File
  - text File：文本文件，包括打开之后能够看的，能够直接阅读的，都是阿斯克玛或者Unicode，经过了编码了之后，不管是中文、英文都是可读的。当然，有一些字符可能不能阅读，比如回车啊等等转义字符。
  -  binary file：二进制文件，除了 text 之外，我们都认为是 binary file，它是以 binary 格式存在那儿的。比如说你编译出来的二进制的这个文件。
  - 对于操作系统Kernal，这些文件都没有区别，都是比特流。至于怎么解读这些文件，那都是后面的应用层干的事情
- directory：目录，本质是一个文件。对于目录来说，它里面存的内容就是一些链接。这些 link 去指向你的文件，这个文件就是包含在这个目录里面的，当然它也可以去指向其他的目录，比如目录的子目录
  - 任何一个刚创建的目录它都会包含两个，一个是`.`，一个是`..`，它代表的含义就是当前目录和上一级目录这两个方式，这样可以使得你在目录里面进行一些游走
- 非regular的文件：
  - 比如对应外设的文件（参考下面的部分）
  - 一些像比较抽象的逻辑上的东西，也可以当成文件。
    - 文件也可以对应到一些抽象的概念，比如说name，pipe， symbolic link 
    - pipe 你可以认为它是个管道，你可以认为它可以去链接两个进程，把链接把进程联系在一块，有一个虚拟的这样一个文件，它甚至不需要真正创建出来，他只要在内存里面有，然后临时使用，到时候可以销毁的。他扮演的工作或者对他的这个处理的方式，还是可以把它当成一个文件。

#### 4）Linux文件系统

- Linux文件系统如下图所示：
- 根节点值是唯一的，那是一个斜杠，代表于根节点。分叉的方式形成目录，子目录的子目录这样一个分级的方式形成一棵树。
- Linux、 Mac 目录结构都是类似的，都是以功能进行划分的。
- 比如说bin，我们知道它是 binary 的缩写，所以它下面放的都是二进制的，你们命令执行的那些可执行文件放在 bin下面。
- dev 代表的是硬件外设，像tty这种外设终端，它都会有一个目录下的文件的方式存在，就是说你可以通过对于这些文件的操作，直接和外部的设备打交道。当然你必须要知道它的这个约定它的格式才能进行操作。
- 所以我们和这个外设打交道的方式，往往是通过一些间接的方式，就像 standard IO 这种方式来进行这个操作，通过这个 device 下面的这个所有外设的对应的文件来处理的，而这些文件就是所谓的非 irregular 的文件。
  - 例如u 盘，在dev下面就会有文件对应，这个文件你可以认为它就代表了这个对应的硬件，你可以和它进行交互，你可以读写它，但是它会有自己的这个约定。
- ETC 下面的可能是一些这个配置的环境，然后 home 我们知道这就是大家不同的用户他自己的主目录
- user 是只和特定用户相关的一些信息
- 不同的场景可能不一样，比如说 windows 下面的目录结构，它分成a、b、c、 d 盘

![截屏2023-03-29 22.27.11](./1-IO.assets/%E6%88%AA%E5%B1%8F2023-03-29%2022.27.11.png)



#### 5）Directory

- Directory你可以认为它是一个层次化的结构，就是倒过来的一棵树
- 可以像 CD 这样的命令来改变这个当前的这个目录，
- working directory的概念，就是每个用户他登录之后，他当前在通过 shell 的方式进行访问，还是通过这个文件管理器的方式，图形化的管理，不管怎么样他都会有一个当前的目录的 working directory 的这个概念，就是当前的正正你正处于的这个文件目录。
- 你可以从这一点出发，向下去访问你下面的文件和子目录，或者上向上回退。
- 你要找到一个跳转到一个确定的位置的话，可以通过
  - 绝对路径
  - 相对路径

#### 6）Open

##### a）文件读写

- 我们说文件的操作主要是读和写，大部分文件还有一个操作就是打开和关闭。
- 实际上文件操作**并不需要打开文件**，因为这两个东西并没有一个必然的这个联系，所以它并不是必须的。
- 为什么大部分情况下我们会有 open file？ open file 其实是告诉Kernel，让Kernel引起说我对某个文件有兴趣，然后接下来的操作和会和这个文件建立联系，然后我为了使得我下面的操作比较简单，比较容易，发送的命令比较短等等一系列的好处，所以需要操作系统来为我提供一些服务。
- 我打开文件之后会做读写，会做多个操作，那么我先需要和操作系统说明一下，然后操作系统就可以为我当前的这一次打开文件的一系列操作去增加一些这个信息，保留在这个操作系统里面。
- 接下来我要和操作系统打交道的时候，就可以很快的告诉他我是哪一次打开下面的这个功能。所以它其实是为了建立一个所谓的session，这里包括一个会话才需要去打开这个文件。
- 换句话之后我们不打开文件，也不影响我们去读文件，因为文件就是存在那里。打开文件**主要是为了管理，当然还会有些什么这个权限检查等等**

##### b）文件描述符

- 我打开文件之后，我下面的这个操作和这个当前的 open 的这一系列操作要联系在一块，什么东西作为一个纽带把它们联系在一块？descripter 描述符！
- **描述符的意义**：我每一次不用都和操作系统说是哪一个，哪一个、哪个文件，然后我是谁，我有什么权限都要说这一遍，这遍内容太长了，那么当我第一次打开了之后，它会返回一个descripter，然后下次我要读和写的时候只要拿着这个 descriptor 这个标识符，系统内核就知道是你了！之前做过的事情比如权限检查就可以省略掉了。
- **描述符的表示**：一个整数非负的。标识符并不需要那么复杂，因为每个进程它打开的文件数量并没有那么多，它这个比较容易，所以它其实只需要一个整形的一个数就可以了，而且这个数是从非负：0 开始的。它其实只是一个索引，它有专门的一个对应的一个宿主，一个宿主来管理相应的信息，而你拿着这个 descript 就可以找到这个宿主。
- **宿主：**宿主里面有对应的link，可以链接到我们需要的这个当前这一次打开的信息，可以链接到我们需要的这个当前这一次打开的信息，Kernel可以帮助你来 track 整个的 open file 的所有的信息，包括你当前文件读到哪儿相对的位置信息，然后有几个人打开了这个跟参与了当前的这一次的这个会话，

### 二、内核文件数据结构

#### 1）内核文件数据结构概述

- 最左边这一块是每一个进程都有的descriptor table
  - 每一个进程会有一个所谓的 descriptor table（类比一个数组，所以进程的文件描述符用一个非负的整数表示，因为对应一个数组下标）我们拿着 descripter 其实是在这个 describe table 里面找到对应的link。这个 link 指向下图中间的open file table 
  - 最左边的这个是每一个进程自己的独立的 private 的
- 中间的是open file table 
  - 它代表了某一个文件的一次打开，所以这是一个动态的部分，当你调用 open 的时候就会创建对应的这个结构。
  - 这部分是所有的进程共享的。理论上都可以访问的到，但是你能不能访问到依赖于这个进程里面的 file describe table 有没有对应的链接，可以链到它，就说你可以访问。
  -  open file table 记录了某一次打开的所有文件相关的一些信息（一个是position，一个是refcnt）：
    - 最主要信息就是一个文件的 position 当前位置这个概念，这个当前位置在打开的时候可以确定，然后随着你的读和写，这个当前位置都会发生变化，它会往后走，自动往后走。Kernel会帮你记录当前位置。它的默认就是从 file 起点开始读
    - reference count代表有多少个这样的 point 指向这个 open file table。每次调用 open file 的时候都会创建这样的一个table，然后有一个指针指向它。如果有多次打开的时候，这个refcnt可能就会超过1。大部分情况都是1。
  - open file table 这是一个动态的概念，每一次打开我们会创建对应的，有打开就会有关闭，关闭的时候会销毁它，为了记录还有没有人用，我们有专门的一个叫 reference count 的这个东西，那么每打开的时候他 reference count 等于1，多一个人指向他，代表多一个人可以访问他。当 reference count 等于 0 没有人使用的时候，就可以关闭了
  - 为什么会需要有这样的东西来进行管理呢？因为这个表是所有进程共享，怎么知道这个有没有人访问他呢？所以要记录好每一次 open 的时候，你需要对应的增加，然后再减少，这样你才能知道什么时候去销毁它，把这个部分回收掉，
- 右边的是V-node Table
  - 右边这个就相当于是个静态部分，可以理解这是你写的代码，最右边的这个部分就是静态的代码，而中间的open file table 类比运行代码
  - 个文件，你创建了之后，你写的东西放在磁盘上，文件就在那，文件的 Meta data 都放在这，文件的大小、文件的类型之类的，你打开它和不打开它它都在右边那个表。
  - 某一次打开的文件，你总是要对应到具体打开哪个文件，以这个 open file 这个 table 里面会有指针指向这一次打开具体的这个文件。
  - 文件的这些 Meta date 或者元信息都会记录在这个 v node table 这个 file 里面，最典型的就是文件大小、访问权限控制，最后的一些时间、文件类型等等都会放在这里面。
  - 这部分是所有的进程共享的。

![截屏2023-03-29 22.47.30](./1-IO.assets/%E6%88%AA%E5%B1%8F2023-03-29%2022.47.30.png)



#### 2）Descriptor table

- Descriptor table属于每个进程独立的自己私有的信息，它的索引是通过文件的 FD 就 file descript 来进行索引的。他的Value会是个指针指向中间的这个 file table 的这个结构
- Descriptor table存在大小限制，它可以通过配置，代表你同时打开能有多少文件。
- 每次打开的时候会在里面找到最小的一个位置来填充文件描述符还有指针，就相当于一些空位，你都可以去使用它。

#### 3）open file table

- 它记录的是一些当前打开这一次动态的一些概念，最主要的就是 file position 当前的这个位置，这样可以让用户在提交读写的时候，不用每一次自己去记录从哪里开始读，从哪里开始写，否则的话你就要自己在应用程序里面去记了
- 硬件不需要去维护中间这些信息，这样它的扩展性会比较好
- 所以Unix文件系统是有状态的，这个状态就是指 file table 中间的这个中间这个东西。有一些 point 指向后面的 v node，v node 对应的就是一个实际文件

### 三、Open/Close系统调用

#### 1）API

```cpp
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>

int open(char *filename, int flags, mode_t mode);
		Returns: new file descriptor if OK, -1 on error
- flags
  - O_RDONLY, O_WRONLY, O_RDWR (must have one)
  - O_CREAT, O_TRUNC, O_APPEND (optional)
- mode 
  - S_IRUSR, S_IWUSR, S_IXUSR
  - S_IRGRP, S_IWGRP, S_IXGRP
  - S_IROTH, S_IWOTH, S_IXOTH
```

- open 有 3 个参数，第一个开哪个文件。要给它对应绝对路径/相对路径，

- 剩下两个，一个叫flags，一个叫mode，前面这个是控制打开的方式，以及这个文件相关的这个当前这一次打开的方式。而下面这个 MOD 代表了其实是一个权限的一个管理。

#### 2）flags

- flags的第一行是必选的，包括操作的类型：有 read only、write only、read write
- flags的第一行是可以选择的
  - 第一个叫做create，没有这个文件，它还可以用来创建。但是如果有这个文件你去创建会报错！
  - 第二个是O_TRUNC、以写的方式打开的情况下，他把你的 position 放在最开头，这样你写的情况下并不是插入记录在里面的所有写操作，并不是插入操作，而是直接覆盖
  - 第三个是append、append 大家可以理解，就是把当前的 position 指向文件的结尾，这样你的写操作就是 append 在后面了

#### 3）mod

- mode 相当于是一个权限，你在创建文件的时候可以设立权限
- 3* 3 的代表了什么呢？是三类权限的三组用户
  - 第一组是用户自己，第二组是用户所在的组，第三组是其他用户
  - 权限有 read only 的， write only 的和 exclusive 可以执行的

- 如下图所示的输出是什么？

```cpp
#include "csapp.h"
int main()
{
 	int fd1, fd2;
 	fd1 = Open("foo.txt", O_RDONLY, 0);
 	Close(fd1);
 	fd2 = Open("baz.txt", O_RDONLY, 0);
 	printf("fd2 = %d\n", fd2);
 	exit(0);
}
```

- 任何一个进程会默认被打开三个文件，打开 3 个 FD 被占用掉，分别是012，对应的是标准输入、标准输出和标准的错误输出。
- 打开的第一个文件它就需要从 3 开始，关闭了之后再打开的时候还会确定是3。如果没有关闭再打开就是4。
- 如果你关闭一个文件关闭两次，关闭两次文件它是会报错的？为什么？对于内核来说，他做的事情很多，需要删，他需要去检查。它需要把中间这个文件 file table 里面这个 reference count 要去减1，当 reference count 变成 0 的时候，它对应的这个结构还需要被删除掉，大部分的 close 都会产触发这件事情。此外，文件描述符这个表格也会检查，删除对应的空闲位置，以便下次需要使用的时候有空闲的位置。这个对应的位置就可以下次再被分配了。

### 四、Read/Write系统调用

#### 1）读写API

- 读是从应用程序的角度去对文件，把它读到内存里面。从磁盘 copy 到内存。如果是一个普通的文件的话，那么 read 会指定我 copy 多少的文件到内存。
- 文件会有一个结束符，但是这个结束符并不存在，当操作系统 Kernel 去访问文件读到最后的时候，它是会连带返回一个文件结束符，

```cpp
#include <unistd.h>
ssize_t read(int fd, void *buf, size_t count);
		returns: number of bytes read if OK,  0 on EOF, -1 on error
ssize_t write(int fd, const void *buf, size_t count);
		returns: number of bytes written if OK,  -1 on error
```

- 三个参数分别表示文件标识符、读取目标的内存起始地址，和要读取的数量
- 一般情况下就是读到结尾的时候，你要多读一次，再返回0，就代表了已经读到了文件结尾了
- 这个情况不能简单的说。我这一次没有读到预期的数量，就简单的认为这个已经读到结尾了
- 因为除了读到结尾之外，还有其他的可能造成你 read 读到的数据比这个 count 比你预期的要少，（比如网络问题，用户输入输一半不想输入了）所以不能因为这个来判断有没有读到结尾，必须要额外再读一次返回为 0 的情况才能代表读到结尾

#### 2）区分两个size

- ssize_t：代表有符号的
- size_t：代表无符号的

### 五、Stat系统调用

- 不打开文件也可以做相应的操作，比如函数status，就是在不打开文件的情况下，你直接提供路径，也是可以读出来一个数据结构的，这个数据结构里面放了这个文件的元信息，所谓的 Meta date。
- fstatus就需要文件打开的标识符了，这个需要打开文件才能操作

```cpp
#include <unistd.h>
#include <sys/stat.h>
		int stat(const char *filename, struct stat *buf);
		int fstat(int fd, struct stat *buf) ;
			returns: 0 if OK, -1 on error
```

### 六、目录读写API

- 用的最多就是 open directory， read directory 和 close directory

```cpp
#include <sys/types.h>
#include <dirent.h>
DIR *opendir(const char *filename);
		//returns: pointer to handle if OK, NULL on error
struct dirent *readdir(DIR *dirp);
		//returns: pointer to next directory entry if OK, NULL if no more entry or error
int closedir(DIR *dirp);
		//returns: 0 if OK, -1 on error
```

- open 就是打开一个目录，要给它一个文件的这个name，它的返回值是一个数据结构，这个数据结构里面有两个信息，代表这个文件或者这个目录存在哪的信息，
- 第二个是叫 file name，就是这个目录的名字

- 目录的数据结构如下：

```cpp
struct dirent {
    ino_t d_ino; /*inode number*/
    char  d_name[256]; /*file name */
}
```

- 举例子如下：

```cpp
#include “csapp.h”

int main(int argc, char **argv)
{
   DIR *stream;
   struct dirent *dep;

   steamp = Opendir(argv[1]);
   errno = 0;
   while ((dep = Readdir(streamp)) != NULL) {
	   printf(“Found file: %s\n”, dep->d_name);
   }
   if (errno ! = 0)
	   unix_error(“readdir error”);

   Closedir(streamp);
   exit(0) ;
}
```

### 七、共享读写

#### 1）单一进程

- 假如我用两个文件标识符怎么样呢？假如foobar.txt的文本是`foobar`。

```cpp
#include “csapp.h”
 
int main()
{
	int fd1, fd2;
	char c;
 
	fd1 = open(“foobar.txt”, O_RDONLY, 0) ;
	fd2 = open(“foobar.txt”, O_RDONLY, 0) ;
	read(fd1, &c, 1) ;
	read(fd2, &c, 1) ;
	printf(“c = %c\n”, c) ;
	exit(0)
}
```

- 如下图所示，所以读取到的全部都是f。因为两个的文件指针是独立的

![截屏2023-03-30 00.09.08](./1-IO.assets/%E6%88%AA%E5%B1%8F2023-03-30%2000.09.08.png)

#### 2）父子进程

- 看下面的代码

```cpp
#include “csapp.h”
 
int main()
{
	int fd;
	char c;
 
	fd = open(“foobar.txt”, O_RDONLY, 0) ;
	if (fork() == 0 ) {
		read(fd, &c, 1) ;
 		exit(0) ;
 	}
 	wait(NULL) ;
	read(fd, &c, 1) ;
	printf(“c = %c\n”, c) ;
	exit(0)
}
```

- 由于Fork的时候继承了内存空间，所以ref会变成2，并且读写的时候会操作同一个pos指针
- 所以得到的输出结果是字母o

![截屏2023-03-30 00.12.24](./1-IO.assets/%E6%88%AA%E5%B1%8F2023-03-30%2000.12.24.png)

#### 3）dup2 API

- 把一个旧的文件标识符指向一个新的文件标识符

```cpp
#include <unistd.h>
int dup2(int oldfd, int newfd);
	// returns: nonnegative descriptor if OK,  -1 on error
```

- 如下图所示是执行之前的fd图

![截屏2023-03-30 00.15.36](./1-IO.assets/%E6%88%AA%E5%B1%8F2023-03-30%2000.15.36.png)

- 如下图所示，是把fd4指向的fileA变成了fileB，此时因为fileA的引用已经变成了0，所以操作系统会主动回收。

![截屏2023-03-30 00.16.08](./1-IO.assets/%E6%88%AA%E5%B1%8F2023-03-30%2000.16.08.png)

- 所以下面的输出应该是`o`

```cpp
#include “csapp.h”
 
int main()
{
	int fdA, fdB;
	char c;
 
	fdA = open(“foobar.txt”, O_RDONLY, 0) ;
	fdB = open(“foobar.txt”, O_RDONLY, 0) ;
	read(fdB, &c, 1) ;
 	dup2(fdB, fdA) ;
	read(fdA, &c, 1) ;
	printf(“c = %c\n”, c) ;
	exit(0)
}
```

