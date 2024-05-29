using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using Autodesk.Revit.DB;

namespace srai_addin
{
    public class Load_Data
    {
        public Document Doc;

        public Load_Data(Document doc)
        {
            this.Doc = doc;
        }

        // 추출 메소드
        public string Load_All_Data(string Dataset_name)
        {
            // Revit 정보 수집
            (List<RevitInfo> Element_data, List<string> Pipe_Segment, List<string> Pipe_System_Type, List<string> Duct_System_Type) = Collect_Revit_Data(Doc);
            List<string> Level_Name = Collect_Level_Names(Doc);

            Dictionary<string, object> All_Data = new Dictionary<string, object>();
            var Element_data_transformed = Teansform_RevitData(Element_data);

            All_Data.Add("Dataset_tag", Dataset_name);
            All_Data.Add("Element_data", Element_data_transformed);
            All_Data.Add("Levels", Level_Name);
            All_Data.Add("Pipe_Segments", Pipe_Segment);
            All_Data.Add("Pipe_System_Types", Pipe_System_Type);
            All_Data.Add("Duct_System_Types", Duct_System_Type);

            var dto = new ElementDto() { data = All_Data };

            string json = JsonConvert.SerializeObject(dto, Formatting.Indented);

            return json;
        }

        private (List<RevitInfo>, List<string>, List<string>, List<string>) Collect_Revit_Data(Document doc)
        {
            List<RevitInfo> Element_Data = new List<RevitInfo>();
            List<string> Pipe_segment = new List<string>();
            List<string> Pipe_System_Type = new List<string>();
            List<string> Duct_System_Type = new List<string>();

            // 카테고리 필터
            List<BuiltInCategory> categories = new List<BuiltInCategory>
            {
                BuiltInCategory.OST_DuctCurves,
                BuiltInCategory.OST_PipeCurves,
                BuiltInCategory.OST_DuctFitting,
                BuiltInCategory.OST_PipeFitting,
                BuiltInCategory.OST_PipingSystem,
                BuiltInCategory.OST_DuctSystem,
                BuiltInCategory.OST_PipeSegments
            };

            foreach (BuiltInCategory category in categories)
            {
                FilteredElementCollector collector = new FilteredElementCollector(doc);
                collector.OfCategory(category);
                ICollection<Element> elements = collector.ToElements();

                if (category == BuiltInCategory.OST_PipingSystem)
                {
                    foreach (Element element in elements)
                    {
                        if (element is ElementType)
                        {
                            string System_Type_Value = element.Name;
                            if (!string.IsNullOrEmpty(System_Type_Value))
                            {
                                Pipe_System_Type.Add(System_Type_Value);
                            }
                            else
                                continue;
                        }
                        else
                            continue;
                    }
                }
                else if (category == BuiltInCategory.OST_DuctSystem)
                {
                    foreach (Element element in elements)
                    {
                        if (element is ElementType)
                        {
                            string System_Type_Value = element.Name;
                            if (!string.IsNullOrEmpty(System_Type_Value))
                            {
                                Duct_System_Type.Add(System_Type_Value);
                            }
                            else
                                continue;
                        }
                        else
                            continue;
                    }
                }
                else if (category == BuiltInCategory.OST_PipeSegments)
                {
                    foreach (Element element in elements)
                    {
                        string Pipe_Segment_Value = element.Name;
                        if (!string.IsNullOrEmpty(Pipe_Segment_Value))
                        {
                            Pipe_segment.Add(Pipe_Segment_Value);
                        }
                        else
                            continue;
                    }
                }
                else if (category == BuiltInCategory.OST_DuctCurves || category == BuiltInCategory.OST_PipeCurves
                    || category == BuiltInCategory.OST_DuctFitting || category == BuiltInCategory.OST_PipeFitting)
                {
                    foreach (Element element in elements)
                    {
                        string category_name = element.Category != null ? element.Category.Name : "Uncategorized";

                        if (element is ElementType)
                        {
                            ElementType elementType = element as ElementType;
                            Element_Data.Add(new RevitInfo { Category = category_name, Family = elementType.FamilyName, Type = elementType.Name });
                        }
                        else
                            continue;
                    }
                }
            }
            return (Element_Data, Pipe_segment, Pipe_System_Type, Duct_System_Type);
        }

        public class RevitInfo
        {
            public string Category { get; set; }
            public string Family { get; set; }
            public string Type { get; set; }
        }

        private Dictionary<string, Dictionary<string, List<string>>> Teansform_RevitData(List<RevitInfo> ElementData)
        {
            Dictionary<string, Dictionary<string, List<string>>> groupedData = new Dictionary<string, Dictionary<string, List<string>>>();

            List<string> categories = new List<string>
            {
                "Pipes",
                "Ducts",
                "Pipe Fittings",
                "Duct Fittings"
            };

            foreach (string category in categories)
            {
                var Data = ElementData.Where(info => info.Category == category).GroupBy(info => info.Family)
                    .ToDictionary(familyGroup => familyGroup.Key, familyGroup => familyGroup.Select(info => info.Type).ToList());
                groupedData.Add(category, Data);
            }
            return groupedData;
        }

        private static List<string> Collect_Level_Names(Document doc)
        {
            List<string> levelNames = new List<string>();

            FilteredElementCollector collector = new FilteredElementCollector(doc);
            ICollection<Element> elements = collector.OfClass(typeof(Level)).ToElements();

            foreach (Element element in elements)
            {
                Level level = element as Level;
                if (level != null)
                {
                    levelNames.Add(level.Name);
                }
            }
            return levelNames;
        }

        public class ElementDto
        {
            public string Id { get; set; }
            public Dictionary<string, object> data { get; set; }
        }
    }
}