using Autodesk.Revit.UI;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;
using static System.Windows.Forms.AxHost;

namespace srai_addin
{
    /// <summary>
    /// Window.xaml에 대한 상호 작용 논리
    /// </summary>
    public partial class Window
    {
        public string DatasetName { get; set; }
        public bool IsConfirmed { get; private set; }
        public int State_flag { get; private set; }

        public Window()
        {
            InitializeComponent();
            IsConfirmed = false;
            State_flag = 2;
            DatasetNameTextBox.Focus();
            Closing += Window_Closing;
        }

        private void ConfirmButton_Click(object sender, RoutedEventArgs e)
        {
            DatasetName = DatasetNameTextBox.Text;
            IsConfirmed = false;
            State_flag = 1;
            Close();
        }

        private void Window_Closing(object sender, System.ComponentModel.CancelEventArgs e)
        {
            if (!IsConfirmed)
            {
                // IsConfirmed가 false이면 창을 닫음
                // 여기서 직접적으로 Close 메소드를 호출하지 않고, IsConfirmed를 false로 설정하여 창이 닫히도록 함
                IsConfirmed = true;
            }
            else
            {
                // IsConfirmed가 true이면 창을 닫지 않음
                e.Cancel = true;
                //TaskDialog.Show("Cancel", "The data sync has been cancelled.");
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            IsConfirmed = false;
            State_flag = 2;
            Close(); // 창을 닫음
        }

    }
}