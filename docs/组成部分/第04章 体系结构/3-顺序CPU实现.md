---
title: 第三节 顺序CPU实现
---

import OfficePreview from '@site/src/components/OfficePreview/index';

<OfficePreview place = "/ppt/2-3-seq.ppt"/>

<OfficePreview place = "/ppt/2-4-seq-impl.ppt"/>

## 第三节 顺序CPU实现

> Y86 实现我们分两种实现方式。第一种实现方式我们叫这个顺序实现，那它主要是一种比较简单的，可以把我们的这个 Y86 的基本功能实现出来，但它有个问题就是性能比较低，就这个设计出来的 CPU 比较慢，但是因为它比较基础。根据我们前面所学的，Y86指令长度只可能为1、2、9、10个Byte，一共12类的指令。下面我们就是要讲这 12 类的这个指令我们怎么去实现

### 一、Y86指令Decoding

- 可以把指令的五个部分（实际上最终是5根线，有粗细差异）这样就可以拿到五个信号
- icode、ifun、ra、rb、valC
- 编号1111（也就是原来代表none）的寄存器干什么（比如我想要把一个数据不写入到任何寄存器里面，就可以把目标寄存器设置为1111.

![截屏2023-03-20 09.04.16](./3-%E9%A1%BA%E5%BA%8FCPU%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-20%2009.04.16.png)

### 二、Y86状态码

Y86的每一条指令执行结束之后它是会有状态的

- 1号：AOK：指令正常执行结束，然后执行下一条（正常）
- 2号：HLT：执行了停机指令，然后就停机了（正常）
- 3号：ADR：处理器访问了错误的地址（异常）
  - 可能是在抓取指令的时候（PC错误了指向了错误的指令的地址
  - 或者是在读写数据的时候
  - 超过了我们限制的最大的地址
- 4号：INS：指令不对，例如出现了非法的指令

### 三、指令的处理

> 设计原则：把一个操作分成若干个小操作。一条指令执行，分成若干个小的操作，或者若干个阶段。每个阶段都是一个简单的这样的一个步骤。
>
> - 这样设计有什么好处？就是对这个硬件利用效率就比较高。
> - 这样做的这个难度在哪？用讲每一类指令，它这个要处理的其实是差异比较大，那我们把这个差异很大的一些东西放在一起，变成统一的由若干个简单的操作来完成，那么这个就是我们的一个挑战。

#### 1）指令执行的六个阶段

- Fetch：读取指令，根据PC的指向，去从内存里面存储指令的地方获取指令
- Decode：刚刚讲的，一条指令来了就可以获取5个信号，前面的四个信号长度一样，后面的8Byte（当然不是每个指令都有5个信号，总之decode就是把指令变成信号）【值得注意的是Risk的指令是定长的，那么每次取出来指令的时候就很方便，但是Y86这种不定长度的就很麻烦，只有指令执行完了才知道下一个指令在哪，只有拿到了指令的种类，才知道下一个指令在哪】（所以Y86在Fetch的时候就要做Decode，确定下一个指令在哪）
- Execute：执行，比如算数逻辑运算
- Memory：从内存里面读取或者写入数据（目前没有同时读写mem的指令）
- WriteBack：写入程序寄存器
- PC：更新PC

按照这种顺序执行的就叫做SEQ的一个实现的电路。

#### 2）举例

##### a）Fetch阶段

- 抓取数据的阶段：通过读取指令存储的内存，然后获取要执行的指令，例如获取的指令是60，那么PC未来就要加2。因为这个指令的长度是2Byte。

![截屏2023-03-20 16.55.56](./3-%E9%A1%BA%E5%BA%8FCPU%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-20%2016.55.56.png)

##### b）Decode阶段

- 本来Decode需要获取我们前面所说的五个信号的，比如寄存器啊内存地址啊的五个信号，但是因为Y86，这一步就是只读取寄存器。

##### c）Execute阶段

- 通过ALU计算单元，然后设置条件码，完成计算，把值写入到目标（后面决定目标是寄存器还是内存）

##### d）Memory阶段

- 如果输出值要写入内存，那就这一步要干活了！

##### e）WriteBack阶段

- 写回阶段，把计算结果写入到寄存器

##### f）PC阶段

- 更新PC，然后执行下一个指令，重复操作。

如下图所示，描述的事详细的进行某个操作的过程（正好对应的上面所说的五个过程！）：

![截屏2023-03-20 17.09.54](./3-%E9%A1%BA%E5%BA%8FCPU%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-20%2017.09.54.png)

- 从逻辑上来说CC就应该在执行阶段的时候就写进去了，在写回阶段的时候valE写入到了 R[rb]，还有valP写入PC是在更新PC阶段的时候。但是由于是时序电路，一定要时钟上升的时候才能修改，所以实际上最终他们三个值是被同时修改的。
- **提示：**为什么要做一个valE=0+valA？因为这样是为了设计的统一，所有的写回去的操作都是把valE固定的这个值写回到目标，便于电路设计（不需要做一个多路选择器）

#### 3）SEQ组件

- CPU 它是由可能各种不同的这个电路组成，有一部分是组合电路。那这个就像ALU，我们的这种控制的那种信号，我们因为第四章很多东西，比如说 ALU 我们是不涉及的，我们就假设他有这个东西
- 我们主要设计的是那种控制，就是连接的一些逻辑我们是要设计的
- 组合电路，它的特征就是 input 确定以后，经过一定的 delay 就确定了。
- 还有存储设备，包括寄存器或者内存，因为他们都是通过地址来访问的
- 还有clock register，就存的是这种CC， PC
- 这样的一个就是我们的一个CPU。

![截屏2023-03-20 17.23.06](./3-%E9%A1%BA%E5%BA%8FCPU%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-20%2017.23.06.png)

- 组合电路的行为：我们给了data，我们地址以后，我们要去从 data 这个栏目里把数据读出来。还有我们要举读寄存器，这些读的行为都是组合电路的行为
- 时序电路：对应写入的四个东西（PC、CC、RegisterFile、Memory）所有更新都是在时钟周期Rise的时候

#### 4）ISA和SEQ

-  instruction set architecture：每一个阶段更新某些状态，然后这些状态按照顺序倍更新
- SEQ：所有的状态更新操作发生在时钟周期上升的那一个瞬间

#### 5）为什么不逐一实现

- 假如我们把每个指令都实现一个电路，会造成很大浪费，会产生比较糟糕的一个结果。因为电路大的一块，我们的线可能就走的长了，那我们讲组合电路是说给了input，经过一定的delay， output 就确定了。那这 delay 是由什么东西来决定的？是你这个信号传递的距离来决定，如果你这个传的长，那么这个时间就长，一个硬件的代价比较高。
- 第二个可能你这个效率也会比较糟糕，可能 a 只有 1/ 4 的时间会有一个，那 return 指令，可能整个程序里只有 2% 的这个指令有它，那你也给他单独设计了一堆电路，那整个这个只有 2% 的时候会去走这个电路，那么这个就浪费。
- 有这些特殊情况，它不太好处理。比如流水线，我们要这个异常处理

#### 6）Push和Pop

- 下图所示是压栈和退栈的时候，详细过程
- 为什么叫valE，因为是Execute这个步骤产生的值
- 为什么叫valM，因为是访问内存的值来的
- 所以valE和valM执行的时候出现冲突，因为有两个写端口，冲突的时候以valM为主！valM优先。
- CPU的时钟周期需要足够长，需要确保计算的结果全部都已经完成了才能周期变化，这时候出发写操作

![截屏2023-03-20 18.06.15](./3-%E9%A1%BA%E5%BA%8FCPU%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-20%2018.06.15.png)

#### 6）Jmp/Call/Ret指令

- 下面的是jmp指令、call指令的详细过程

![截屏2023-03-20 18.26.46](./3-%E9%A1%BA%E5%BA%8FCPU%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-20%2018.26.46.png)

### 四、SEQ硬件结构

:::info
这一部分将会详细的介绍上面说的不同阶段的电路！
:::

- 下图中：蓝色的代表已经设计好的硬件模块
- 灰色的代表控制逻辑，需要用HCL硬件控制语言来设计的
- 白色的部分，例如icode，代表信号的标签
- 不同长度的线：64bit的是最粗的线，其次是4-8bit的，虚线是1-bit的

![截屏2023-03-20 20.43.04](./3-%E9%A1%BA%E5%BA%8FCPU%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-20%2020.43.04.png)

#### 1）Fetch

- fetch的 input 只有一个，就在PC读出来以后它就作为一个地址，就给instruction memory，因为指令是放这里，然后这个 PC 还会过去算valueP，valueP要根据这个指令类型然后计算下一个指令的地址，所以还是要先把它读出来。
- 指令肯定是第一次，因为我不知道这个指令到底多长，那我肯定一次要读10个Byte，因为最长是 10 个百。我可能这样读出来肯定没有问题，最多读多了不要了。**但是这10个里面最重要的是第一个Byte，决定指令的种类！**
- 然后把第一个Byte分裂，分成icode和ifun。那为什么是灰色？因为读取出来的时候可能是个非法的指令，所以需要我们手动判断一下是否合法，非法就是instrvalid这个路线
- 然后根据icode种类，判断是否需要valC和需要寄存器，如果都不需要，PC就只用加2，反之根据情况调整PC，这个是由PC increment
- 假如这个指令后面有1或者9个Byte，说明需要寄存器/valC存在，那就需要在去读取后面的三个信号



![截屏2023-03-20 20.47.39](./3-%E9%A1%BA%E5%BA%8FCPU%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-20%2020.47.39.png)

```HCL
# 是否需要寄存器
bool need_regids = icode in { IRRMOVQ, IIRMOVQ, IRMMOVQ, IMRMOVQ, IOPQ, IPUSHQ, IPOPQ };

# 是否是合法的指令
bool instr_valid = icode in { IHALT, INOP, IRRMOVQ, IIRMOVQ, IRMMOVQ, IMRMOVQ, IOPQ, IJXX, ICALL, IRET, IPUSHQ, IPOPQ };

# 如果icode在读取内存的时候出现错误就把这个指令忽略
int icode = [
	imem_error: INOP;
	1: icode0;
]
```

#### 2）Decode

- 如下所示，decode是读寄存器，writeBack是写寄存器，那也就如下所示把这个两个 stage 就放在一起
- 例如在读取的时候，通过valA或者valB来获取到寄存器的值
- 在写入到寄存器的之后，有两个写口，分别是valM和valE
- 那我们为了确认读取的时候读的是哪一个寄存器，需要srcA、srcB来作为读取的源
- 此外写操作的时候，为了确认写入的是哪一个寄存器，需要dstE、dstM标识写入的寄存器

![截屏2023-03-20 21.10.36](./3-%E9%A1%BA%E5%BA%8FCPU%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-20%2021.10.36.png)

```
# srcA当是涉及到栈的操作的时候，需要是rsp，否则就是rA了
int srcA = [
	icode in { IRRMOVQ, IRMMOVQ, IOPL, IPUSHQ } : rA;
	icode in { IPOPQ, IRET } : RRSP;
	1 : RNONE; # Don't need register
];
```

#### 3）执行逻辑

- ALU：算术逻辑单元，输入两个a、b，实现四个算数运算：加、减、and、xor
- 计算后，会根据结果调整CC条件码的值。
- 我们知道一些指令例如条件mov指令，需要根据指令具体的值，来得出条件是否成立，这时候的输入就是CC和ifun，经过判断得到一个0/1的值，
- 注意：只有当icode是OP的时候，才可以setCC，这时候计算结果才会把CC条件码寄存器设置
- ALUfun指定具体的计算类型，是加还是减还什么操作。

![截屏2023-03-20 22.06.47](./3-%E9%A1%BA%E5%BA%8FCPU%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-20%2022.06.47.png)

- 具体的分情况考虑如下所示

```
int aluA = [
	icode in { IRRMOVQ, IOPQ } : valA;
	icode in { IIRMOVQ, IRMMOVQ,IMRMOVQ} : valC;
	icode in { ICALL, IPUSHQ } : -8;
	icode in { IRET, IPOPQ } 	 : 8;
	# Other instructions don't need ALU
];
```

- 观察ALU计算的操作，可以发现经常是在作为加法器使用，所以默认就是做加法，如果ifun执行了其他的计算规则，那就是其他的规则。

```
int alufun = [
	icode == IOPQ : ifun;
	1 : ALUADD;
];

```

- 设置条件码寄存器的时候，当且仅当是IOPQ指令的时候。

```
Bool set_cc = icode in { IOPQ };
```

- 再次强调Y86只能单独的读或者写内存，不可能有类似`add %rax (%rsp)`

#### 4）内存访问

- Memaddr代表要写的内存的地址，MemData代表要写的数据
- stat是什么？报错，例如在内存访问阶段出现错误，就会报错imem_error，如果在fetch阶段，比如PC地址出错就会报错instr_valid。



![截屏2023-03-20 22.41.20](./3-%E9%A1%BA%E5%BA%8FCPU%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-20%2022.41.20.png)

```
int mem_addr = [
	icode in { IRMMOVQ, IPUSHQ, 				ICALL, IMRMOVQ } : valE;
	icode in { IPOPL, IRET } : valA;
	# Other instructions don't need address
];
```

#### 5）更新下一个PC

- 更新下一个PC

```
int new_pc = [
	icode == ICALL : valC;        # call指令，对应val C
	icode == IJXX && Cnd : valC;  # 有条件跳转，必须要条件成立，才会跳转，否则就是valC
	icode == IRET : valM;         # Ret指令，Val M
	1 : valP;                     # 其余全部都是valP
];
```



![截屏2023-03-20 22.51.19](./3-%E9%A1%BA%E5%BA%8FCPU%E5%AE%9E%E7%8E%B0.assets/%E6%88%AA%E5%B1%8F2023-03-20%2022.51.19.png)

### 五、小结

- 把每一条指令都用 6 个简单的步骤来表示，每条指令都有 6 个简单的步骤，然后任意一类的这个指令都是按照相同的这个流，相同的这个逻辑流来执行。因为我们这 6 步是确定的，他总是 fetch、decode、execute、memory、writeBack、PC update
- 有一些预先定义的逻辑，设计的目的是Control Logic把预先定义的模块连接起来
- 缺点分析1：一条指令执行分成了6个步骤，这 6 个步骤要在一个Cycle周期里面完成，其实时间完成的步骤还是比较长的，而且读写Mem的操作也是比寄存器慢的，所以性能不太好
- 缺点分析2：这个硬件的利用率也非常的低，那第一条指令 fetch 结束之后，后头 5 个stage，这个 fetch 这边硬件这边，这些硬件全部都是空闲的。也就是说，一个部分在忙碌的时候，其余的所有部分都是空闲的！这就是利用率不高的问题所在。
- 因此，流水线设计的CPU是更好的选择。我们在设计流水线之前，我们先要把这个 sequential 这个先设计出来，
