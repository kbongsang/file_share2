using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Autodesk.Revit.Attributes;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;
using Newtonsoft.Json;
using Fleck;
using Newtonsoft.Json.Linq;
using System.Diagnostics;
using srai_addin;
using System.Windows.Forms;
using System.Windows.Media.Imaging;
using System.Windows.Media.Media3D;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;

namespace SMAI
{
    public class App : IExternalApplication
    {
        public const string TITLE = "Smart Routing AI";
        public WebSocketServer server = new WebSocketServer("ws://127.0.0.1:3001");
        public static List<IWebSocketConnection> allSockets = new List<IWebSocketConnection>();

        public Result OnStartup(UIControlledApplication app)
        {
            // UI Setup.
            var panel = app.CreateRibbonPanel(Tab.AddIns, "Smart Routing AI");
            var thisAssemblyPath = Assembly.GetExecutingAssembly().Location;
            var parentDirectory = Directory.GetParent(thisAssemblyPath).Parent.FullName;
            Uri uri_1 = new Uri(Path.Combine(Path.GetDirectoryName(parentDirectory), "icons/icon_32bit_1.ico")); // 32 X 32 ico file
            Uri uri_2 = new Uri(Path.Combine(Path.GetDirectoryName(parentDirectory), "icons/icon_32bit_2.ico"));
            Uri uri_3 = new Uri(Path.Combine(Path.GetDirectoryName(parentDirectory), "icons/icon_32bit_3.ico"));

            // buttons.
            CreatePushButton(panel, "Launch", "Launch", "Click to run Smart Routing AI", thisAssemblyPath, "SMAI.Launch", uri_1);
            CreatePushButton(panel, "Sync", "Sync", "Click to send current visible BIM to Smart Routing AI", thisAssemblyPath, "SMAI.Sync", uri_3);
            CreatePushButton(panel, "Import", "Import", "Click to create BIM data based on the JSON file.", thisAssemblyPath, "SMAI.Import", uri_2);

            // Connect to the server.
            //var server = new Server();

            server.Start(socket =>
            {
                socket.OnOpen = () =>
                {
                    TaskDialog.Show(TITLE,
                        $"New connection: {socket.ConnectionInfo.ClientIpAddress}:{socket.ConnectionInfo.ClientPort}"
                        );
                    allSockets.Add(socket);
                };

                socket.OnMessage = message =>
                {
                    TaskDialog.Show(TITLE, $"Message received: {message}");
                    socket.Send("Server received your message: " + message);
                };

                socket.OnClose = () =>
                {
                    TaskDialog.Show(TITLE, "Connection closed");
                    allSockets.Remove(socket);
                };
            });

            return Result.Succeeded;
        }

        public Result OnShutdown(UIControlledApplication app)
        {
            server.Dispose();

            return Result.Succeeded;
        }

        public void CreatePushButton(RibbonPanel panel, string name, string text, string tool_tip, string assemblyPath, string className, Uri uri)
        {
            var btnData = new PushButtonData(name, text, assemblyPath, className);
            var btn = panel.AddItem(btnData) as PushButton;
            BitmapImage bitmap = new BitmapImage(uri);

            btn.ToolTip = tool_tip;
            btn.LargeImage = bitmap;
        }
    }

    [Transaction(TransactionMode.Manual)]
    public class Launch : IExternalCommand
    {
        public Result Execute(ExternalCommandData revit, ref string message, ElementSet elements)
        {
            // Samrt Routing AI 설치경로 찾아가는 기능 넣기
            var programFilesPath = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            var SMAI_Path = Path.Combine(programFilesPath, "Smart Routing AI", "Smart Routing AI.exe"); //두번째에는 Program Files안의 설치 프로그램 폴더, 마지막은 실행 프로그램
            Process.Start(SMAI_Path);

            return Result.Succeeded;
        }
    }

    [Transaction(TransactionMode.Manual)]
    public class Import : IExternalCommand
    {
        public Result Execute(ExternalCommandData revit,
            ref string message, ElementSet elements)
        {
            var doc = revit.Application.ActiveUIDocument.Document;

            // 파일 탐색기 다이얼로그 열기
            OpenFileDialog openFileDialog = new OpenFileDialog
            {
                Filter = "JSON 파일 (*.json)|*.json|모든 파일 (*.*)|*.*"
            };

            if (openFileDialog.ShowDialog() == DialogResult.OK)
            {
                // 사용자가 선택한 파일의 경로 가져오기
                string selectedFilePath = openFileDialog.FileName;

                // JSON 파일 읽기
                try
                {
                    var jsonText = File.ReadAllText(selectedFilePath);

                    JObject jsonObj = JObject.Parse(jsonText);

                    // 인스턴스 생성
                    Element_create Pipe_create = new Element_create(jsonObj, "Pipes", doc);
                    Pipe_create.Create_element();

                    Element_create Duct_create = new Element_create(jsonObj, "Ducts", doc);
                    Duct_create.Create_element();
                }
                catch (Exception ex)
                {
                    // 오류 처리
                    TaskDialog.Show("오류", $"파일을 읽는 동안 오류 발생: {ex.Message}");
                }
            }
            else
            {
                // 사용자가 취소한 경우
                TaskDialog.Show("취소", "파일 선택이 취소되었습니다.");
            }

            return Result.Succeeded;
        }
    }

    [Transaction(TransactionMode.Manual)]
    public class Sync : IExternalCommand
    {
        public Result Execute(ExternalCommandData revit,
            ref string message, ElementSet elements)
        {
            srai_addin.Window inputWindow;
            inputWindow = new srai_addin.Window();
            inputWindow.ShowDialog();

            var Dataset_name = inputWindow.DatasetName;

            if ((string.IsNullOrWhiteSpace(Dataset_name) || Dataset_name.Length < 4))
            {
                if (inputWindow.State_flag == 1)
                {
                    TaskDialog.Show("Warning", "Dataset name is missing or too short. Please enter at least 4 characters.");
                    return Result.Succeeded;
                }
                else
                {
                    TaskDialog.Show("Cancel", "The data sync has been cancelled.");
                    return Result.Succeeded;
                }

            }
            else
            {
                // 클라이언트 측에서 데이터를 받기 시작한 뒤 시간 측정을 위함.
                foreach (var socket in App.allSockets)
                {
                    socket.Send("1");
                }

                Stopwatch stopwatch = new Stopwatch();
                stopwatch.Start();

                var doc = revit.Application.ActiveUIDocument.Document;
                Sync_app sync_app = new Sync_app(revit, Dataset_name);
                sync_app.Sync_run();

                // 빌트인 데이터 보내기
                Load_Data Load_data = new Load_Data(doc);
                var Built_in_data = Load_data.Load_All_Data(Dataset_name);

                foreach (var socket in App.allSockets)
                {
                    socket.Send(Built_in_data);
                }

                // 클라이언트 측에서 데이터를 받기 시작한 뒤 시간 측정을 위함.
                foreach (var socket in App.allSockets)
                {
                    socket.Send("2");
                }
                stopwatch.Stop();

                //Revit의 Data Export 시간 측정
                TimeSpan processingTime = stopwatch.Elapsed;
                int minutes = processingTime.Minutes;
                double seconds = processingTime.TotalSeconds - (minutes * 60);
                TaskDialog.Show("Processing Time", $"Processing time: {minutes} minutes {seconds:F3} seconds");

                return Result.Succeeded;
            }
        }


        public class ElementDto
        {
            public string Id { get; set; }
            public Dictionary<string, object> data { get; set; }
        }

        public class ElementDtos
        {
            public List<ElementDto> elements = new List<ElementDto>();
        }

        public class Triangle
        {
            public int Index;
            public Coordinate Coordinate;
        }

        public class MeshDto
        {
            public List<Triangle> Triangles = new List<Triangle>();
        }

        public struct Coordinate
        {
            public double X;
            public double Y;
            public double Z;
        }

        //2021
        /*public static class UnitUtil
        {
            public static double Convert(Autodesk.Revit.DB.Document doc, UnitType unitType, double number, bool appendSymbol)
            {
                var value = UnitFormatUtils.Format(doc.GetUnits(), unitType, number, true, true, new FormatValueOptions() { AppendUnitSymbol = appendSymbol });
                return Double.Parse(value);
            }
        }*/

        //2024
        public static class UnitUtil
        {
            public static double Convert(Autodesk.Revit.DB.Document doc, ForgeTypeId unitTypeId, double number, bool appendSymbol)
            {
                // Note: This assumes that the correct ForgeTypeId instance has been obtained
                var value = UnitFormatUtils.Format(doc.GetUnits(), unitTypeId, number, false, new FormatValueOptions() { AppendUnitSymbol = appendSymbol });
                return Double.Parse(value, System.Globalization.CultureInfo.InvariantCulture);
            }
        }
    }
}

// 빌드 시 아래 오류 발생
/*Downloading https://github.com/wixtoolset/wix3/releases/download/wix3112rtm/wix311-binaries.zip
       Error failed to bundle project: `https://github.com/wixtoolset/wix3/releases/download/wix3112rtm/wix311-binaries.zip: Connection Failed: Connect error: 연결된 구성원으로부터 응답이 없어 연결하지 못했거나, 호스트로부터 응답이 없어 연결이 끊어졌습니다. (os error 10060)`
*/

// 커넥터 설명
/*
// TOMB531 사이즈 3500 X 4900 X 3300

// 1번 구역 (아래로 오프셋, 오른쪽에 점대칭1750X1500)

#1-1

1/4"_PN2 (GBG, 장비 외측 수평, 커넥터 없음)    1/4"_PN2
1/4"_Ar(PAr, 장비 외측 수평)     1/4"_NH3
1/4"_SiH4   1/4"_PN2
1/4"_PN2
1/4"_Ar

#1-2

1/2"_PA(LPA)     1/2"_PA     1/2"_Coolant_R Heater 왼       1/2"_Coolant_S Heater 왼
1/2"_PA     1/2"_Coolant_S Lid      1/2"_Coolant_R Chamber      3/4"_PCW_S(PCW(S), 장비 외측 45도, 커넥터 없음)    3/4"_PCW_R

#1-3 아래

1/4"_TEOS   1/4"_GN2_Heater Purge(GN2)   1/4"_PN2    1/4"_Ar     1/4"_O2 (PO2, 장비 외측 수평)     1/4"_Ar     1/4"_NF3     1/4"_Ar    1/4"_PN2

#1-4
100A_Exhaust_Gas Box

#1-5
160A_Foreline

#1-6
50A_Exhaust Lid Box (캐비넷배기(CABINET), 서브팹 덕트에서 출발 커넥터 따로 없음)
25A_Exhaust S/H(열배기(HEAT), 덕트에서 출발 커넥터 따로 없음)

// 2번 구역 (중앙 긴 부분 3750X850)

#2-1
40A_Foreline_TM

#2-2
40A_Foreline_LL2

#2-3
40A_Foreline_LL1

#2-4
3/8"_PA_Moving 왼
3/8"_PCW_R 아래      1/4"_PN2 아래        1/2"_PN2 아래


// 3번 구역 (중앙 긴 부분 1500X3500)

#3-1
1"_PCW_R
1"_PCW_S

#3-2
미사용 위

#3-3 오른
3/8"_PA_Moving
3/8"_PV (PV, 장비측 수평, 커넥터 없음)

#3-4
1"_PCW_R
1"_PCW_S


// 장비 펌프 커넥터 설명 종류
40A_Foreline_SIDE1
40A_Foreline_SIDE2
160A_Foreline
100A_Foreline

50A_Foreline_LL1(연결 X, 구분 필요)
50A_Foreline_LL2(연결 X, 구분 필요)
40A_Foreline_TM(연결 X, 구분 필요)

// 체크사항

그룹 4의 시작점은 통합 모델에서 S5_Utility에 NF3 값을 가진 장비들이 있음,
여기에 커넥터 설명에 NF3이 들어가 있음.
SiH4, N2O

이 또한 임의로 잡아야 할듯
다만 어떤 장비는 통합 모델에 패밀리 인스턴스가 존재하지만, 어떤 모델은 존재하지 않음.
모두 다 대상인지 명확하게 확인이 필요함.
LEFT쪽 모델은 객체가 없음, RIGHT쪽은 링크 모델과 오버랩되는 장비 존재
냉각수의 경우도 패밀리 인스턴스가 존재하지 않음.

그룹 4의 시작점은 통합 모델에서 S5_Utility에 NF3, SiH4, N2O 값을 가진 장비들이 있음,
여기에 커넥터 설명에 NF3, SiH4, N2O이 들어가 있음.

 Coolant, 그룹 4: N2O, PF3 등, 그룹 4: SiH4, TEOS


GN2 n1 t4
PV n1 t1
PN2 n7 t20
Ar n5 t15
O2 n1 t3
PCWs n1 t10 --|
PCWr n1 t10 --|  group
PA n3 t14
Coolant(s, r)
-4개씩 올라옴
-A/P 설비에서 브랜칭X
-총2세트(2장비 4개씩)
-그림에서 확인하면 장비에서 4가닥이 올라와1가닥으로 쭉 올라가고 마지막에 다시4가닥으로 나눠집니다
그룹(브랜치x)
NH3 x 4, N20 x 4, NF3 x 4
SiH4 x 4, TEOS x 4
-홀수라고 적혀있습니다

*/